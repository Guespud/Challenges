import { prisma } from '../lib/prisma.js';
import { OCCUPYING_STATUSES } from '../domain/appointment-state-machine.js';

interface Slot {
  startsAt: string;
  endsAt: string;
}

function parseTimeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToDate(baseDate: Date, minutes: number): Date {
  const date = new Date(baseDate);
  date.setUTCHours(0, minutes, 0, 0);
  return date;
}

/**
 * Calcula los slots libres de un médico para un día dado. Los slots no se
 * persisten: se derivan de `DoctorAvailability` (horario recurrente) menos las
 * citas que ya ocupan ese rango (ver OCCUPYING_STATUSES).
 */
export async function getAvailableSlots(doctorId: string, date: Date): Promise<Slot[]> {
  const dayOfWeek = date.getUTCDay();

  const availabilities = await prisma.doctorAvailability.findMany({
    where: { doctorId, dayOfWeek },
  });

  if (availabilities.length === 0) {
    return [];
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const busyAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: OCCUPYING_STATUSES },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
    select: { startsAt: true, endsAt: true },
  });

  const slots: Slot[] = [];

  for (const availability of availabilities) {
    const startMinutes = parseTimeToMinutes(availability.startTime);
    const endMinutes = parseTimeToMinutes(availability.endTime);

    for (let cursor = startMinutes; cursor + availability.slotDurationMin <= endMinutes; cursor += availability.slotDurationMin) {
      const slotStart = minutesToDate(dayStart, cursor);
      const slotEnd = minutesToDate(dayStart, cursor + availability.slotDurationMin);

      const overlaps = busyAppointments.some(
        (appt) => slotStart < appt.endsAt && appt.startsAt < slotEnd,
      );

      if (!overlaps) {
        slots.push({ startsAt: slotStart.toISOString(), endsAt: slotEnd.toISOString() });
      }
    }
  }

  return slots;
}
