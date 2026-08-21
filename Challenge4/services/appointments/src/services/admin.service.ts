import { notFound, sharedContent } from '@vitalis/shared';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getUsersByIds } from '../lib/user-projection.js';
import type { adminAppointmentsQuerySchema } from '../schemas/appointment.schema.js';

const { errors } = sharedContent;

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

  const appointments = await prisma.appointment.findMany({
    where,
    include: { service: true },
    orderBy: { startsAt: 'desc' },
  });

  // Sin FK a User: se resuelven los nombres en una sola consulta batch a la
  // proyección local, en vez de un `include` de Prisma (que ya no existe
  // entre bases distintas).
  const userIds = appointments.flatMap((a) => [a.patientId, a.doctorId]);
  const users = await getUsersByIds(userIds);

  return appointments.map((appointment) => ({
    ...appointment,
    patient: users.get(appointment.patientId) ?? null,
    doctor: users.get(appointment.doctorId) ?? null,
  }));
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
