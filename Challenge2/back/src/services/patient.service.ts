import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { listHabitHistory } from './habit.service.js';
import content from '../content/es.json' with { type: 'json' };

export async function listPatients() {
  return prisma.user.findMany({
    where: { role: 'patient' },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
}

export async function getPatientHabits(patientId: string, days: number) {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: 'patient' },
  });
  if (!patient) {
    throw notFound(content.errors.patientNotFound);
  }

  return listHabitHistory(patientId, days);
}
