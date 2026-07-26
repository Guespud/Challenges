import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { processCheckoutCompleted } from '../src/services/webhook.service.js';

let doctorId: string;
let serviceId: string;
let patientId: string;

async function createPendingAppointment() {
  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      doctorId,
      serviceId,
      startsAt: new Date(Date.now() + 24 * 60 * 60_000),
      endsAt: new Date(Date.now() + 24 * 60 * 60_000 + 30 * 60_000),
      status: 'pending',
      holdExpiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  return appointment;
}

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

beforeAll(async () => {
  const doctor = await prisma.user.create({
    data: { email: `doctor-${randomUUID()}@test.com`, passwordHash: 'x', name: 'Dr. Test', role: 'doctor' },
  });
  const patient = await prisma.user.create({
    data: { email: `patient-${randomUUID()}@test.com`, passwordHash: 'x', name: 'Patient Test', role: 'patient' },
  });
  const service = await prisma.service.create({
    data: { name: 'Consulta test', durationMin: 30, priceCents: 60000 },
  });
  doctorId = doctor.id;
  patientId = patient.id;
  serviceId = service.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('idempotencia del webhook de Stripe (ADR-007)', () => {
  it('procesar el mismo evento dos veces no duplica el Payment ni reaplica el efecto', async () => {
    const appointment = await createPendingAppointment();
    const paymentIntentId = `pi_test_${randomUUID()}`;
    const eventId = `evt_test_${randomUUID()}`;

    const event = fakeCheckoutCompletedEvent(appointment.id, paymentIntentId, eventId);

    await processCheckoutCompleted(event, 'req-1');
    await processCheckoutCompleted(event, 'req-2'); // mismo event.id, entrega duplicada

    const updated = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(updated.status).toBe('paid');

    const payments = await prisma.payment.findMany({ where: { appointmentId: appointment.id } });
    expect(payments).toHaveLength(1);

    const events = await prisma.appointmentEvent.findMany({
      where: { appointmentId: appointment.id, type: 'payment_recorded' },
    });
    expect(events).toHaveLength(1);

    const webhookEvents = await prisma.webhookEvent.findMany({ where: { stripeEventId: eventId } });
    expect(webhookEvents).toHaveLength(1);
  });

  it('dos eventos distintos para la misma cita solo aplican el efecto una vez (protegido por el estado)', async () => {
    const appointment = await createPendingAppointment();
    const paymentIntentId = `pi_test_${randomUUID()}`;

    const firstEvent = fakeCheckoutCompletedEvent(appointment.id, paymentIntentId, `evt_test_${randomUUID()}`);
    const secondEvent = fakeCheckoutCompletedEvent(appointment.id, paymentIntentId, `evt_test_${randomUUID()}`);

    await processCheckoutCompleted(firstEvent, 'req-1');
    await processCheckoutCompleted(secondEvent, 'req-2'); // event.id distinto, misma cita

    const payments = await prisma.payment.findMany({ where: { appointmentId: appointment.id } });
    expect(payments).toHaveLength(1);
  });
});
