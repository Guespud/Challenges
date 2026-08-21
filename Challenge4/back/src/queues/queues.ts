import { Queue, type DefaultJobOptions } from 'bullmq';
import { redisConnection } from '../lib/redis.js';

/** Ver ADR-008: retry acotado con backoff exponencial para trabajo con efectos externos. */
export const RETRY_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: { age: 86_400 },
  removeOnFail: false,
};

export interface HoldExpiryJobData {
  appointmentId: string;
  requestId: string;
}

export interface ReminderJobData {
  appointmentId: string;
  requestId: string;
}

export interface NotificationJobData {
  appointmentId: string;
  requestId: string;
}

export const holdExpiryQueue = new Queue<HoldExpiryJobData>('hold-expiry', {
  connection: redisConnection,
});

export const remindersQueue = new Queue<ReminderJobData>('reminders', {
  connection: redisConnection,
  defaultJobOptions: RETRY_JOB_OPTIONS,
});

export const notificationsQueue = new Queue<NotificationJobData>('notifications', {
  connection: redisConnection,
  defaultJobOptions: RETRY_JOB_OPTIONS,
});

export const reconciliationQueue = new Queue('reconciliation', {
  connection: redisConnection,
});
