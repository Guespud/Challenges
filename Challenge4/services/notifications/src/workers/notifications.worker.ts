import { Worker } from 'bullmq';
import { childLogger, createLogger, EVENT_STREAMS, type EmailJobData, type NotificationDeliveredPayload } from '@vitalis/shared';
import { redisConnection } from '../lib/redis.js';
import { sendEmail } from '../lib/email.js';
import { eventPublisher } from '../lib/events.js';

const baseLogger = createLogger('notifications-worker');

export const notificationsWorker = new Worker<EmailJobData>(
  'notifications',
  async (job) => {
    const { appointmentId, requestId, patientEmail, doctorName, serviceName, startsAt } = job.data;
    const log = childLogger(baseLogger, requestId);

    await sendEmail(
      patientEmail,
      'Confirmación de tu cita — Vitalis Clinic',
      `<p>Tu cita de ${serviceName} con ${doctorName} el ${new Date(startsAt).toLocaleString('es-MX')} quedó confirmada y pagada.</p>`,
    );

    await eventPublisher.publish<NotificationDeliveredPayload>(EVENT_STREAMS.notificationDelivered, {
      type: 'NotificationDelivered',
      requestId,
      data: { appointmentId, kind: 'confirmation', status: 'sent' },
    });

    log.info({ appointmentId }, 'email de confirmación enviado');
  },
  { connection: redisConnection },
);

// Ver ADR-008: solo se publica notification_failed cuando se agotaron los
// intentos (BullMQ ya reintentó solo, con backoff, hasta acá).
notificationsWorker.on('failed', async (job, error) => {
  if (!job) return;
  const attemptsMax = job.opts.attempts ?? 1;
  if (job.attemptsMade < attemptsMax) return;

  await eventPublisher.publish<NotificationDeliveredPayload>(EVENT_STREAMS.notificationDelivered, {
    type: 'NotificationDelivered',
    requestId: job.data.requestId,
    data: {
      appointmentId: job.data.appointmentId,
      kind: 'confirmation',
      status: 'failed',
      errorMessage: error.message,
    },
  });
});
