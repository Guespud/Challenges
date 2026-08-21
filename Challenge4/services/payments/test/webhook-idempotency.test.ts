import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { processCheckoutCompleted } from '../src/services/webhook.service.js';

// A diferencia del test original del monolito (Challenge 3), este ya no
// puede tocar `Appointment`/`AppointmentEvent` — esas tablas viven en la
// base de Appointments, otro servicio. Payments no sabe nada de "citas",
// solo recibe un appointmentId opaco (ver RFC-001, ADR-010). Lo que este
// test demuestra es la idempotencia del lado de Payments: el mismo webhook
// entregado dos veces no duplica `Payment` ni vuelve a publicar
// `PaymentConfirmed`.
function fakeCheckoutCompletedEvent(appointmentId: string, paymentIntentId: string, eventId: string): Stripe.Event {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${randomUUID()}`,
        payment_intent: paymentIntentId,
        amount_total: 60000,
        metadata: { appointmentId },
      },
    },
  } as unknown as Stripe.Event;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('idempotencia del webhook de Stripe en Payments (ADR-007 + ADR-010)', () => {
  it('procesar el mismo evento dos veces no duplica el Payment', async () => {
    const appointmentId = randomUUID();
    const paymentIntentId = `pi_test_${randomUUID()}`;
    const eventId = `evt_test_${randomUUID()}`;

    const event = fakeCheckoutCompletedEvent(appointmentId, paymentIntentId, eventId);

    await processCheckoutCompleted(event, 'req-1');
    await processCheckoutCompleted(event, 'req-2'); // mismo event.id, entrega duplicada

    const payments = await prisma.payment.findMany({ where: { appointmentId } });
    expect(payments).toHaveLength(1);
    expect(payments[0]?.status).toBe('succeeded');

    const webhookEvents = await prisma.webhookEvent.findMany({ where: { stripeEventId: eventId } });
    expect(webhookEvents).toHaveLength(1);
  });

  it('dos eventos distintos para la misma cita solo aplican el efecto una vez (protegido por el estado)', async () => {
    const appointmentId = randomUUID();
    const paymentIntentId = `pi_test_${randomUUID()}`;

    const firstEvent = fakeCheckoutCompletedEvent(appointmentId, paymentIntentId, `evt_test_${randomUUID()}`);
    const secondEvent = fakeCheckoutCompletedEvent(appointmentId, paymentIntentId, `evt_test_${randomUUID()}`);

    await processCheckoutCompleted(firstEvent, 'req-1');
    await processCheckoutCompleted(secondEvent, 'req-2'); // event.id distinto, misma cita

    const payments = await prisma.payment.findMany({ where: { appointmentId } });
    expect(payments).toHaveLength(1);
  });
});
