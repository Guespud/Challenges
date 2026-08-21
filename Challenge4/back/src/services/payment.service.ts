import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notificationsQueue, remindersQueue } from '../queues/queues.js';
import { env } from '../config/env.js';

/**
 * Aplica el efecto de "pago confirmado" a una cita: pending -> confirmed -> paid,
 * crea el Payment, registra los AppointmentEvent. Protegido por el chequeo de
 * `status !== 'pending'` dentro de la transacción — llamarlo dos veces para la
 * misma cita (desde el webhook y desde reconciliación, por ejemplo) es seguro:
 * la segunda vez no hace nada porque el estado ya avanzó.
 *
 * Devuelve `true` si aplicó el efecto, `false` si no había nada que hacer.
 */
export async function confirmPayment(
  appointmentId: string,
  paymentIntentId: string,
  amountCents: number,
  requestId: string,
  eventPayload: Prisma.InputJsonValue = {},
): Promise<boolean> {
  const applied = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.status !== 'pending') {
      return false;
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'confirmed', stripePaymentIntentId: paymentIntentId, holdExpiresAt: null },
    });
    await tx.appointmentEvent.create({
      data: { appointmentId, type: 'payment_confirmed', payload: eventPayload },
    });

    await tx.payment.create({
      data: { appointmentId, stripePaymentIntentId: paymentIntentId, amountCents, status: 'succeeded' },
    });
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'paid' } });
    await tx.appointmentEvent.create({ data: { appointmentId, type: 'payment_recorded' } });

    return true;
  });

  if (!applied) {
    return false;
  }

  await notificationsQueue.add('confirmation', { appointmentId, requestId });

  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  const reminderAtMs = appointment.startsAt.getTime() - env.REMINDER_HOURS_BEFORE * 60 * 60_000;
  const delay = Math.max(reminderAtMs - Date.now(), 0);
  await remindersQueue.add('reminder', { appointmentId, requestId }, { delay, jobId: `reminder-${appointmentId}` });

  return true;
}
