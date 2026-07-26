import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { getAvailableSlots } from '../src/services/availability.service.js';

let doctorId: string;
let serviceId: string;
let patientId: string;

// Próximo lunes a partir de hoy, para tener un dayOfWeek estable en el test.
function nextMonday(): Date {
  const date = new Date();
  const day = date.getUTCDay();
  const diff = (8 - day) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

beforeAll(async () => {
  const doctor = await prisma.user.create({
    data: { email: `doctor-${randomUUID()}@test.com`, passwordHash: 'x', name: 'Dr. Slots', role: 'doctor' },
  });
  const patient = await prisma.user.create({
    data: { email: `patient-${randomUUID()}@test.com`, passwordHash: 'x', name: 'Patient Slots', role: 'patient' },
  });
  const service = await prisma.service.create({
    data: { name: 'Consulta slots', durationMin: 30, priceCents: 50000 },
  });
  doctorId = doctor.id;
  patientId = patient.id;
  serviceId = service.id;

  await prisma.doctorAvailability.create({
    data: { doctorId, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', slotDurationMin: 30 },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('cálculo de slots disponibles', () => {
  it('devuelve todos los slots del rango cuando no hay citas', async () => {
    const monday = nextMonday();
    const slots = await getAvailableSlots(doctorId, monday);
    expect(slots).toHaveLength(2); // 09:00-09:30 y 09:30-10:00
  });

  it('excluye un slot ya ocupado por una cita pending/confirmed/paid/reminded', async () => {
    const monday = nextMonday();
    const slotStart = new Date(monday);
    slotStart.setUTCHours(9, 0, 0, 0);
    const slotEnd = new Date(monday);
    slotEnd.setUTCHours(9, 30, 0, 0);

    await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        serviceId,
        startsAt: slotStart,
        endsAt: slotEnd,
        status: 'confirmed',
      },
    });

    const slots = await getAvailableSlots(doctorId, monday);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startsAt).toBe(slotEnd.toISOString());
  });
});
