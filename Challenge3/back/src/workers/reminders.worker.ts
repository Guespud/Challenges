import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { workerLogger } from '../lib/logger.js';
import type { ReminderJobData } from '../queues/queues.js';

export const remindersWorker = new Worker<ReminderJobData>(
  'reminders',
  async (job) => {
    const { appointmentId, requestId } = job.data;
    const log = workerLogger(requestId);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, service: true },
    });

    if (!appointment || appointment.status !== 'paid') {
      log.info({ appointmentId }, 'recordatorio omitido: la cita ya no está en paid');
      return;
    }

    await sendEmail(
      appointment.patient.email,
      'Recordatorio de tu cita — Vitalis Clinic',
      `<p>Tu cita de ${appointment.service.name} con ${appointment.doctor.name} es el ${appointment.startsAt.toLocaleString('es-MX')}.</p>`,
    );

    await prisma.$transaction([
      prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'reminded' } }),
      prisma.appointmentEvent.create({ data: { appointmentId, type: 'reminder_sent' } }),
    ]);
  },
  { connection: redisConnection },
);

// Ver ADR-008: solo se marca `reminder_failed` cuando se agotaron los 3 intentos,
// no en cada fallo individual (esos los reintenta BullMQ solo, con backoff).
remindersWorker.on('failed', async (job, error) => {
  if (!job) return;
  const attemptsMax = job.opts.attempts ?? 1;
  if (job.attemptsMade < attemptsMax) return;

  await prisma.appointmentEvent.create({
    data: {
      appointmentId: job.data.appointmentId,
      type: 'reminder_failed',
      payload: { message: error.message },
    },
  });
});
