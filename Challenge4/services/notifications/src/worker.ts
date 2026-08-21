import { createLogger, initSentry } from '@vitalis/shared';
import { env } from './config/env.js';
import './workers/notifications.worker.js';
import './workers/reminders.worker.js';

const logger = createLogger('notifications-worker');

initSentry('notifications-worker', env.SENTRY_DSN);

logger.info('worker de notifications levantado: notifications + reminders');
