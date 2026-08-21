import { nowLikeStored, conflict, notFound, sharedContent } from '@vitalis/shared';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { CANCELLABLE_STATUSES, OCCUPYING_STATUSES, PAID_STATUSES } from '../domain/appointment-state-machine.js';
import { holdExpiryQueue, notificationsQueue, remindersQueue } from '../queues.js';
import { createCheckoutSession, refundPayment } from '../lib/payments-client.js';
import { getUser } from '../lib/user-projection.js';

const { errors } = sharedContent;

interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  requestId: string;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw notFound(errors.serviceNotFound);

  const doctor = await getUser(input.doctorId);
  if (!doctor) throw notFound(errors.doctorNotFound);

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

  // El hold vence HOLD_TTL_MINUTES antes de la hora de la cita, no
  // HOLD_TTL_MINUTES después de crearla — ver ADR heredado del monolito.
  const MIN_HOLD_MS = 60_000;
  const holdExpiresAt = new Date(
    Math.max(startsAt.getTime() - env.HOLD_TTL_MINUTES * 60_000, nowLikeStored().getTime() + MIN_HOLD_MS),
  );

  const appointment = await prisma.$transaction(async (tx) => {
    const overlapping = await tx.appointment.findFirst({
      where: {
        doctorId: input.doctorId,
        status: { in: OCCUPYING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlapping) throw conflict(errors.slotNotAvailable);

    const created = await tx.appointment.create({
      data: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        serviceId: input.serviceId,
        startsAt,
        endsAt,
        status: 'pending',
        holdExpiresAt,
      },
    });

    await tx.appointmentEvent.create({ data: { appointmentId: created.id, type: 'created' } });

    return created;
  });

  // Único punto de llamada síncrona entre servicios en toda la app: se
  // justifica porque el usuario necesita el checkoutUrl YA, no de forma
  // asíncrona. Si Payments falla acá, la cita `pending` ya existe pero
  // nunca recibe checkoutSessionId; el hold-expiry la limpia igual.
  const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:5173';
  const { checkoutUrl, checkoutSessionId } = await createCheckoutSession({
    appointmentId: appointment.id,
    amountCents: service.priceCents,
    serviceName: service.name,
    successUrl: `${frontendUrl}/citas/${appointment.id}?pago=exitoso`,
    cancelUrl: `${frontendUrl}/citas/${appointment.id}?pago=cancelado`,
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { stripeCheckoutSessionId: checkoutSessionId },
  });

  await holdExpiryQueue.add(
    'expire',
    { appointmentId: appointment.id, requestId: input.requestId },
    { delay: Math.max(holdExpiresAt.getTime() - nowLikeStored().getTime(), 0), jobId: `hold-expiry-${appointment.id}` },
  );

  return { appointment, checkoutUrl };
}

interface CancelActor {
  id: string;
  role: 'patient' | 'doctor' | 'staff';
}

export async function cancelAppointment(appointmentId: string, actor: CancelActor) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw notFound(errors.appointmentNotFound);

  if (actor.role === 'patient' && appointment.patientId !== actor.id) {
    throw notFound(errors.appointmentNotFound);
  }

  if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
    throw conflict(errors.appointmentNotCancellable);
  }

  if (!PAID_STATUSES.includes(appointment.status)) {
    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'cancelled' } }),
      prisma.appointmentEvent.create({
        data: { appointmentId, type: 'cancelled', payload: { actorId: actor.id, actorRole: actor.role } },
      }),
    ]);
    // Notifications no tiene base propia para volver a chequear el estado
    // antes de mandar el recordatorio - se lo removemos de la cola acá.
    await remindersQueue.remove(`reminder-${appointmentId}`);
    return prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  }

  try {
    const { refundId } = await refundPayment(appointmentId);

    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'cancelled' } }),
      prisma.appointmentEvent.create({
        data: { appointmentId, type: 'refund_issued', payload: { refundId } },
      }),
      prisma.appointmentEvent.create({
        data: { appointmentId, type: 'cancelled', payload: { actorId: actor.id, actorRole: actor.role } },
      }),
    ]);
    await remindersQueue.remove(`reminder-${appointmentId}`);
  } catch (error) {
    await prisma.appointmentEvent.create({
      data: {
        appointmentId,
        type: 'refund_failed',
        payload: { message: error instanceof Error ? error.message : String(error) },
      },
    });
    // La cita NO cambia de estado: un fallo de refund es visible (evento +
    // panel admin), no se cancela "a medias".
    throw conflict('No se pudo procesar el reembolso; la cita sigue activa. Reintenta o contacta soporte.');
  }

  return prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
}

export async function listMyAppointments(patientId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { patientId },
    include: { service: true },
    orderBy: { startsAt: 'desc' },
  });

  const doctorIds = [...new Set(appointments.map((a) => a.doctorId))];
  const doctors = await Promise.all(doctorIds.map((id) => getUser(id)));
  const doctorsById = new Map(doctors.filter((d) => d !== null).map((d) => [d.id, d]));

  return appointments.map((a) => ({ ...a, doctor: doctorsById.get(a.doctorId) ?? null }));
}

/** Agenda de solo lectura del médico — ver SPEC.md, tabla de roles. */
export async function listMyAgendaAsDoctor(doctorId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { doctorId },
    include: { service: true },
    orderBy: { startsAt: 'desc' },
  });

  const patientIds = [...new Set(appointments.map((a) => a.patientId))];
  const patients = await Promise.all(patientIds.map((id) => getUser(id)));
  const patientsById = new Map(patients.filter((p) => p !== null).map((p) => [p.id, p]));

  return appointments.map((a) => ({ ...a, patient: patientsById.get(a.patientId) ?? null }));
}

// --- Consumidores de eventos de otros servicios (ver workers/event-consumers.ts) ---

/**
 * Reacciona a PaymentConfirmed (publicado por Payments). Aplica
 * pending -> confirmed -> paid en la ÚNICA base que conoce el estado real de
 * la cita, y desde acá dispara los emails (Notifications) porque Appointments
 * es quien sabe la hora de la cita (necesaria para calcular el delay del
 * recordatorio) y quien tiene los datos denormalizados para el email.
 *
 * Idempotente: si la cita ya no está en `pending`, no hace nada — protege
 * contra reintentos del evento o una reconciliación que llega después del
 * webhook.
 */
export async function applyPaymentConfirmed(
  appointmentId: string,
  paymentIntentId: string,
  requestId: string,
): Promise<void> {
  const appointment = await prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!existing || existing.status !== 'pending') {
      return null;
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'paid', holdExpiresAt: null },
    });
    await tx.appointmentEvent.create({
      data: { appointmentId, type: 'payment_confirmed', payload: { paymentIntentId } },
    });

    return tx.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { service: true } });
  });

  if (!appointment) return;

  const doctor = await getUser(appointment.doctorId);
  const patient = await getUser(appointment.patientId);
  if (!doctor || !patient) return;

  const emailData = {
    appointmentId,
    requestId,
    patientEmail: patient.email,
    doctorName: doctor.name,
    serviceName: appointment.service.name,
    startsAt: appointment.startsAt.toISOString(),
  };

  await notificationsQueue.add('confirmation', emailData);

  const reminderAtMs = appointment.startsAt.getTime() - env.REMINDER_HOURS_BEFORE * 60 * 60_000;
  const delay = Math.max(reminderAtMs - nowLikeStored().getTime(), 0);
  await remindersQueue.add('reminder', emailData, { delay, jobId: `reminder-${appointmentId}` });
}

/** Reacciona a NotificationDelivered (publicado por Notifications). */
export async function applyNotificationDelivered(
  appointmentId: string,
  kind: 'confirmation' | 'reminder',
  status: 'sent' | 'failed',
  errorMessage?: string,
): Promise<void> {
  const eventType =
    kind === 'confirmation'
      ? status === 'sent'
        ? 'confirmation_sent'
        : 'notification_failed'
      : status === 'sent'
        ? 'reminder_sent'
        : 'reminder_failed';

  await prisma.appointmentEvent.create({
    data: { appointmentId, type: eventType, payload: errorMessage ? { message: errorMessage } : undefined },
  });

  if (kind === 'reminder' && status === 'sent') {
    await prisma.appointment.updateMany({
      where: { id: appointmentId, status: 'paid' },
      data: { status: 'reminded' },
    });
  }
}
