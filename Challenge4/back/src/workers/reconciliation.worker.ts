import { randomUUID } from 'node:crypto';
import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { stripe } from '../lib/stripe.js';
import { workerLogger } from '../lib/logger.js';
import { confirmPayment } from '../services/payment.service.js';

const STALE_AFTER_MS = 5 * 60_000;

/**
 * Red de seguridad para el caso "el webhook nunca llegó" (ver matriz de error
 * paths en SPEC.md). Corre cada 5 min: busca citas `pending` con un Checkout
 * Session asociado y más viejas que STALE_AFTER_MS, consulta el estado real
 * en Stripe y corrige. No usa retry propio (ver ADR-008): si esta corrida
 * falla, la siguiente (5 min después) vuelve a intentarlo.
 *
 * Se busca por `stripeCheckoutSessionId`, no por `stripePaymentIntentId`: el
 * PaymentIntent no existe todavía en el momento en que se crea la cita —
 * Stripe lo genera recién cuando el cliente llega a pagar — así que confiar
 * en ese campo para encontrar citas "colgadas" las dejaría invisibles para
 * siempre si el webhook nunca llegó.
 */
export const reconciliationWorker = new Worker(
  'reconciliation',
  async () => {
    // No hay un request HTTP originador (esto corre por cron) — se genera un
    // request_id propio por corrida para poder correlacionar todo lo que
    // dispare (logs, jobs de notificación/recordatorio) con esta ejecución.
    const requestId = `reconciliation-${randomUUID()}`;
    const log = workerLogger(requestId);
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

    const staleAppointments = await prisma.appointment.findMany({
      where: {
        status: 'pending',
        stripeCheckoutSessionId: { not: null },
        createdAt: { lt: staleBefore },
      },
    });

    for (const appointment of staleAppointments) {
      if (!appointment.stripeCheckoutSessionId) continue;

      const session = await stripe.checkout.sessions.retrieve(appointment.stripeCheckoutSessionId);
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

      if (session.payment_status === 'paid' && paymentIntentId) {
        const applied = await confirmPayment(
          appointment.id,
          paymentIntentId,
          session.amount_total ?? 0,
          requestId,
          { reconciledFrom: 'stale-pending-scan' },
        );
        if (applied) {
          log.warn({ appointmentId: appointment.id }, 'reconciliación corrigió un pago sin webhook recibido');
        }
      }
    }
  },
  { connection: redisConnection },
);
