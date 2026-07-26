import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import content from '../content/es.json' with { type: 'json' };
import type { adminAppointmentsQuerySchema } from '../schemas/appointment.schema.js';
import type { z } from 'zod';

const { errors } = content;

export async function listAppointments(query: z.infer<typeof adminAppointmentsQuerySchema>) {
  const where: Record<string, unknown> = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.date) {
    const dayStart = new Date(`${query.date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    where.startsAt = { gte: dayStart, lt: dayEnd };
  }

  return prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctor: { select: { id: true, name: true } },
      service: true,
    },
    orderBy: { startsAt: 'asc' },
  });
}

export async function getAppointmentEvents(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) {
    throw notFound(errors.appointmentNotFound);
  }

  return prisma.appointmentEvent.findMany({
    where: { appointmentId },
    orderBy: { createdAt: 'asc' },
  });
}
