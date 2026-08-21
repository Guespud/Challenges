import { createLogger, initSentry } from '@vitalis/shared';
import { env } from './config/env.js';
import './workers/hold-expiry.worker.js';
import { startAppointmentsEventConsumers } from './workers/event-consumers.js';

const logger = createLogger('appointments-worker');

initSentry('appointments-worker', env.SENTRY_DSN);

startAppointmentsEventConsumers();

logger.info('worker de appointments levantado: hold-expiry + consumers (user-registered, payment-confirmed, notification-delivered)');
