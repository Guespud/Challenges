import { Worker } from 'bullmq';
import { childLogger, createLogger, EVENT_STREAMS, type EmailJobData, type NotificationDeliveredPayload } from '@vitalis/shared';
import { redisConnection } from '../lib/redis.js';
import { sendEmail } from '../lib/email.js';
import { eventPublisher } from '../lib/events.js';

const baseLogger = createLogger('notifications-worker');

/**
 * A diferencia del monolito, este worker ya no consulta
 * `appointment.status !== 'paid'` antes de mandar el recordatorio —
 * Notifications no tiene base propia. En su lugar, Appointments remueve el
 * job de esta cola (`remindersQueue.remove`) al cancelar una cita, así que
 * si este job corre es porque la cita seguía activa cuando se programó y
 * nadie la canceló después.
 */
export const remindersWorker = new Worker<EmailJobData>(
  'reminders',
  async (job) => {
    const { appointmentId, requestId, patientEmail, doctorName, serviceName, startsAt } = job.data;
    const log = childLogger(baseLogger, requestId);

    await sendEmail(
      patientEmail,
      'Recordatorio de tu cita — Vitalis Clinic',
      `<p>Tu cita de ${serviceName} con ${doctorName} es el ${new Date(startsAt).toLocaleString('es-MX')}.</p>`,
    );

    await eventPublisher.publish<NotificationDeliveredPayload>(EVENT_STREAMS.notificationDelivered, {
      type: 'NotificationDelivered',
      requestId,
      data: { appointmentId, kind: 'reminder', status: 'sent' },
    });

    log.info({ appointmentId }, 'email de recordatorio enviado');
  },
  { connection: redisConnection },
);

remindersWorker.on('failed', async (job, error) => {
  if (!job) return;
  const attemptsMax = job.opts.attempts ?? 1;
  if (job.attemptsMade < attemptsMax) return;

  await eventPublisher.publish<NotificationDeliveredPayload>(EVENT_STREAMS.notificationDelivered, {
    type: 'NotificationDelivered',
    requestId: job.data.requestId,
    data: {
      appointmentId: job.data.appointmentId,
      kind: 'reminder',
      status: 'failed',
      errorMessage: error.message,
    },
  });
});
