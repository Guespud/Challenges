import { randomUUID } from 'node:crypto';
import { Worker } from 'bullmq';
import { childLogger, createLogger } from '@vitalis/shared';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { stripe } from '../lib/stripe.js';
import { confirmPayment } from '../services/payment.service.js';

const baseLogger = createLogger('payments-worker');
const STALE_AFTER_MS = 5 * 60_000;

/**
 * Red de seguridad para el caso "el webhook nunca llegó". Corre cada 5 min:
 * busca PendingCheckout sin resolver y más viejos que STALE_AFTER_MS,
 * consulta el estado real en Stripe y corrige — todo dentro de la base de
 * Payments, sin volver a preguntarle nada a Appointments (a diferencia del
 * monolito, que consultaba `Appointment.status === 'pending'` directo).
 */
export const reconciliationWorker = new Worker(
  'reconciliation',
  async () => {
    const requestId = `reconciliation-${randomUUID()}`;
    const log = childLogger(baseLogger, requestId);
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

    const stalePending = await prisma.pendingCheckout.findMany({
      where: { resolvedAt: null, createdAt: { lt: staleBefore } },
    });

    for (const pending of stalePending) {
      const session = await stripe.checkout.sessions.retrieve(pending.stripeCheckoutSessionId);
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

      if (session.payment_status === 'paid' && paymentIntentId) {
        const applied = await confirmPayment(
          pending.appointmentId,
          paymentIntentId,
          session.amount_total ?? 0,
          requestId,
        );
        if (applied) {
          log.warn({ appointmentId: pending.appointmentId }, 'reconciliación corrigió un pago sin webhook recibido');
        }
      }
    }
  },
  { connection: redisConnection },
);
