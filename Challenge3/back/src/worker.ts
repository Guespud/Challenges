import { logger } from './lib/logger.js';
import { initSentry } from './lib/sentry.js';
import { reconciliationQueue } from './queues/queues.js';
import './workers/hold-expiry.worker.js';
import './workers/reminders.worker.js';
import './workers/notifications.worker.js';
import './workers/reconciliation.worker.js';

initSentry();

async function main() {
  await reconciliationQueue.add(
    'tick',
    {},
    { repeat: { every: 5 * 60_000, immediately: true }, jobId: 'reconciliation-tick' },
  );

  logger.info('workers levantados: hold-expiry, reminders, notifications, reconciliation');
}

main().catch((error) => {
  logger.error({ err: error }, 'fallo arrancando workers');
  process.exitCode = 1;
});
