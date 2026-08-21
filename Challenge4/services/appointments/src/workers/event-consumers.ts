import {
  startEventConsumer,
  EVENT_STREAMS,
  type UserRegisteredPayload,
  type PaymentConfirmedPayload,
  type NotificationDeliveredPayload,
} from '@vitalis/shared';
import { env } from '../config/env.js';
import { upsertUserProjection } from '../lib/user-projection.js';
import { applyPaymentConfirmed, applyNotificationDelivered } from '../services/appointment.service.js';

const SERVICE_GROUP = 'appointments-service';

export function startAppointmentsEventConsumers() {
  const consumers = [
    startEventConsumer({
      redisUrl: env.REDIS_URL,
      stream: EVENT_STREAMS.userRegistered,
      group: SERVICE_GROUP,
      consumerName: `${SERVICE_GROUP}-1`,
      onEvent: async (event) => {
        await upsertUserProjection(event.data as UserRegisteredPayload);
      },
    }),
    startEventConsumer({
      redisUrl: env.REDIS_URL,
      stream: EVENT_STREAMS.paymentConfirmed,
      group: SERVICE_GROUP,
      consumerName: `${SERVICE_GROUP}-1`,
      onEvent: async (event) => {
        const data = event.data as PaymentConfirmedPayload;
        await applyPaymentConfirmed(data.appointmentId, data.paymentIntentId, event.requestId);
      },
    }),
    startEventConsumer({
      redisUrl: env.REDIS_URL,
      stream: EVENT_STREAMS.notificationDelivered,
      group: SERVICE_GROUP,
      consumerName: `${SERVICE_GROUP}-1`,
      onEvent: async (event) => {
        const data = event.data as NotificationDeliveredPayload;
        await applyNotificationDelivered(data.appointmentId, data.kind, data.status, data.errorMessage);
      },
    }),
  ];

  return () => consumers.forEach((c) => c.stop());
}
