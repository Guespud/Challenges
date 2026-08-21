import { EVENT_STREAMS, notFound, serviceUnavailable, type PaymentConfirmedPayload } from '@vitalis/shared';
import { prisma } from '../lib/prisma.js';
import { stripe } from '../lib/stripe.js';
import { eventPublisher } from '../lib/events.js';
import type { CreateCheckoutSessionInput } from '../schemas/checkout.schema.js';

/**
 * Llamado por Appointments (HTTP interno) al crear una cita. Payments no
 * sabe nada de "citas" ni de médicos/pacientes — solo recibe un
 * appointmentId opaco, un monto y las URLs de retorno que Appointments ya
 * armó. Guarda su propio registro de "checkout iniciado" para poder
 * reconciliar después sin volver a preguntarle nada a Appointments.
 */
export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: { name: input.serviceName },
            unit_amount: input.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { appointmentId: input.appointmentId },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
  } catch {
    throw serviceUnavailable('No se pudo iniciar el pago, el proveedor no está disponible. Intenta de nuevo en unos minutos.');
  }

  await prisma.pendingCheckout.create({
    data: {
      appointmentId: input.appointmentId,
      stripeCheckoutSessionId: session.id,
      amountCents: input.amountCents,
    },
  });

  return { checkoutUrl: session.url!, checkoutSessionId: session.id };
}

/**
 * Idempotente: si ya existe un Payment para este appointmentId (llegó el
 * webhook Y corrió la reconciliación, o el webhook llegó duplicado por otra
 * vía), no reaplica nada y devuelve false. El publish de PaymentConfirmed
 * solo pasa la primera vez.
 */
export async function confirmPayment(
  appointmentId: string,
  paymentIntentId: string,
  amountCents: number,
  requestId: string,
): Promise<boolean> {
  const existing = await prisma.payment.findUnique({ where: { appointmentId } });
  if (existing) {
    return false;
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: { appointmentId, stripePaymentIntentId: paymentIntentId, amountCents, status: 'succeeded' },
    }),
    prisma.pendingCheckout.updateMany({
      where: { appointmentId, resolvedAt: null },
      data: { resolvedAt: new Date() },
    }),
  ]);

  await eventPublisher.publish<PaymentConfirmedPayload>(EVENT_STREAMS.paymentConfirmed, {
    type: 'PaymentConfirmed',
    requestId,
    data: { appointmentId, paymentIntentId, amountCents },
  });

  return true;
}

/** Llamado por Appointments (HTTP interno) al cancelar una cita ya pagada. */
export async function refundPayment(appointmentId: string) {
  const payment = await prisma.payment.findUnique({ where: { appointmentId } });
  if (!payment) {
    throw notFound('No hay un pago registrado para esta cita');
  }

  const refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'refunded', stripeRefundId: refund.id },
  });

  return { refundId: refund.id };
}
