import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { workerLogger } from '../lib/logger.js';
import type { NotificationJobData } from '../queues/queues.js';

export const notificationsWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job) => {
    const { appointmentId, requestId } = job.data;
    const log = workerLogger(requestId);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, service: true },
    });
    if (!appointment) return;

    await sendEmail(
      appointment.patient.email,
      'Confirmación de tu cita — Vitalis Clinic',
      `<p>Tu cita de ${appointment.service.name} con ${appointment.doctor.name} el ${appointment.startsAt.toLocaleString('es-MX')} quedó confirmada y pagada.</p>`,
    );

    await prisma.appointmentEvent.create({ data: { appointmentId, type: 'confirmation_sent' } });
    log.info({ appointmentId }, 'email de confirmación enviado');
  },
  { connection: redisConnection },
);

notificationsWorker.on('failed', async (job, error) => {
  if (!job) return;
  const attemptsMax = job.opts.attempts ?? 1;
  if (job.attemptsMade < attemptsMax) return;

  await prisma.appointmentEvent.create({
    data: {
      appointmentId: job.data.appointmentId,
      type: 'notification_failed',
      payload: { message: error.message },
    },
  });
});
