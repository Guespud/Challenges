import type Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { confirmPayment } from './payment.service.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Procesa `checkout.session.completed` de forma idempotente. Ver ADR-007: la
 * clave de idempotencia es `event.id`, insertado en `WebhookEvent` en su propia
 * transacción antes de aplicar cualquier efecto. Si el INSERT choca con el
 * constraint único, el evento ya se procesó — se responde 200 sin reaplicar
 * nada (el efecto en sí, `confirmPayment`, es además idempotente por su cuenta:
 * lo reusa el job de reconciliación).
 */
export async function processCheckoutCompleted(event: Stripe.Event, requestId: string): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const appointmentId = session.metadata?.appointmentId;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (!appointmentId || !paymentIntentId) {
    logger.warn({ request_id: requestId, eventId: event.id }, 'checkout.session.completed sin appointmentId/payment_intent en metadata');
    return;
  }

  try {
    await prisma.webhookEvent.create({ data: { stripeEventId: event.id, type: event.type } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
      logger.info({ request_id: requestId, eventId: event.id }, 'webhook duplicado, ya procesado, no se reaplica');
      return;
    }
    throw error;
  }

  await confirmPayment(appointmentId, paymentIntentId, session.amount_total ?? 0, requestId, {
    stripeEventId: event.id,
  });
}
