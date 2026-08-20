import { prisma } from '../lib/prisma.js';
import { stripe } from '../lib/stripe.js';
import { env } from '../config/env.js';
import { conflict, notFound, serviceUnavailable } from '../lib/errors.js';
import { CANCELLABLE_STATUSES, OCCUPYING_STATUSES, PAID_STATUSES } from '../domain/appointment-state-machine.js';
import { holdExpiryQueue } from '../queues/queues.js';
import { nowLikeStored } from '../lib/time.js';
import content from '../content/es.json' with { type: 'json' };

const { errors } = content;

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

  const doctor = await prisma.user.findFirst({ where: { id: input.doctorId, role: 'doctor' } });
  if (!doctor) throw notFound(errors.doctorNotFound);

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

  // El hold vence HOLD_TTL_MINUTES antes de la hora de la cita, no
  // HOLD_TTL_MINUTES después de crearla: un paciente que agenda con días de
  // anticipación tiene hasta poco antes de su cita para pagar, no solo los
  // primeros minutos tras reservar. Si falta menos de HOLD_TTL_MINUTES para
  // la cita, se deja un margen mínimo (1 min) para pagar en vez de cancelar
  // casi al instante.
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

  // El checkout de Stripe se crea fuera de la transacción: si Stripe falla acá,
  // la cita `pending` ya existe pero nunca recibe checkoutSessionId; el job de
  // hold-expiry la limpia igual en holdExpiresAt sin dejar un hold huérfano.
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: { name: service.name },
            unit_amount: service.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { appointmentId: appointment.id },
      success_url: `${env.FRONTEND_URL ?? 'http://localhost:5173'}/citas/${appointment.id}?pago=exitoso`,
      cancel_url: `${env.FRONTEND_URL ?? 'http://localhost:5173'}/citas/${appointment.id}?pago=cancelado`,
    });
  } catch {
    // Ver matriz de error paths en SPEC.md: Stripe caído al crear el checkout -> 503.
    throw serviceUnavailable(errors.paymentProviderUnavailable);
  }

  // Stripe todavía no asigna un PaymentIntent en este punto — se crea recién
  // cuando el cliente llega a pagar en la página de Checkout. Guardamos solo
  // el checkoutSessionId; el paymentIntentId lo completa el webhook (o la
  // reconciliación) cuando el pago realmente ocurre.
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  await holdExpiryQueue.add(
    'expire',
    { appointmentId: appointment.id, requestId: input.requestId },
    { delay: Math.max(holdExpiresAt.getTime() - nowLikeStored().getTime(), 0), jobId: `hold-expiry-${appointment.id}` },
  );

  return { appointment, checkoutUrl: session.url };
}

interface CancelActor {
  id: string;
  role: 'patient' | 'doctor' | 'staff';
}

export async function cancelAppointment(appointmentId: string, actor: CancelActor) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw notFound(errors.appointmentNotFound);

  if (actor.role === 'patient' && appointment.patientId !== actor.id) {
    // No revelamos que la cita existe si no es del paciente que pregunta.
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
    return prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  }

  const payment = await prisma.payment.findUnique({ where: { appointmentId } });
  if (!payment) {
    // Estado inconsistente (paid sin Payment): no debería ocurrir con el flujo
    // normal, pero fallamos explícito en vez de cancelar sin registrar el cobro.
    throw conflict(errors.appointmentNotCancellable);
  }

  try {
    const refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });

    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: 'refunded', stripeRefundId: refund.id } }),
      prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'cancelled' } }),
      prisma.appointmentEvent.create({
        data: { appointmentId, type: 'refund_issued', payload: { refundId: refund.id } },
      }),
      prisma.appointmentEvent.create({
        data: { appointmentId, type: 'cancelled', payload: { actorId: actor.id, actorRole: actor.role } },
      }),
    ]);
  } catch (error) {
    await prisma.appointmentEvent.create({
      data: {
        appointmentId,
        type: 'refund_failed',
        payload: { message: error instanceof Error ? error.message : String(error) },
      },
    });
    // La cita NO cambia de estado: ver ADR-008, un fallo de refund es visible
    // (evento + panel admin), no se cancela "a medias".
    throw conflict('No se pudo procesar el reembolso; la cita sigue activa. Reintenta o contacta soporte.');
  }

  return prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
}

export async function listMyAppointments(patientId: string) {
  return prisma.appointment.findMany({
    where: { patientId },
    include: { service: true, doctor: { select: { id: true, name: true } } },
    orderBy: { startsAt: 'desc' },
  });
}

/** Agenda de solo lectura del médico — ver SPEC.md, tabla de roles. */
export async function listMyAgendaAsDoctor(doctorId: string) {
  return prisma.appointment.findMany({
    where: { doctorId },
    include: { service: true, patient: { select: { id: true, name: true, email: true } } },
    orderBy: { startsAt: 'desc' },
  });
}
