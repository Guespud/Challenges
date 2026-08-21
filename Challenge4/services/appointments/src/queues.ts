import { Queue } from 'bullmq';
import { CROSS_SERVICE_QUEUES, EMAIL_RETRY_JOB_OPTIONS, type EmailJobData } from '@vitalis/shared';
import { redisConnection } from './lib/redis.js';

export interface HoldExpiryJobData {
  appointmentId: string;
  requestId: string;
}

/** 100% interna: Appointments produce y consume, nadie más la toca. */
export const holdExpiryQueue = new Queue<HoldExpiryJobData>('hold-expiry', {
  connection: redisConnection,
});

/** Cruzan la frontera de servicio: Appointments produce, Notifications consume. */
export const notificationsQueue = new Queue<EmailJobData>(CROSS_SERVICE_QUEUES.notifications, {
  connection: redisConnection,
  defaultJobOptions: EMAIL_RETRY_JOB_OPTIONS,
});

export const remindersQueue = new Queue<EmailJobData>(CROSS_SERVICE_QUEUES.reminders, {
  connection: redisConnection,
  defaultJobOptions: EMAIL_RETRY_JOB_OPTIONS,
});
