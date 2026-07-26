import { prisma } from '../lib/prisma.js';
import type { HabitEntryInput } from '../schemas/habit.schema.js';

function toUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export async function upsertHabitEntry(patientId: string, input: HabitEntryInput) {
  const date = toUtcDate(input.date);

  const existing = await prisma.habitEntry.findUnique({
    where: { patientId_date: { patientId, date } },
  });

  const data = {
    waterMl: input.water_ml,
    exerciseMin: input.exercise_min,
    sleepHours: input.sleep_hours,
  };

  const entry = existing
    ? await prisma.habitEntry.update({ where: { id: existing.id }, data })
    : await prisma.habitEntry.create({ data: { ...data, patientId, date } });

  return { entry, created: existing === null };
}

export async function listHabitHistory(patientId: string, days: number) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  return prisma.habitEntry.findMany({
    where: { patientId, date: { gte: since } },
    orderBy: { date: 'asc' },
  });
}
