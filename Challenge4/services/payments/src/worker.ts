import { createLogger, initSentry } from '@vitalis/shared';
import { env } from './config/env.js';
import { reconciliationQueue } from './queues.js';
import './workers/reconciliation.worker.js';

const logger = createLogger('payments-worker');

initSentry('payments-worker', env.SENTRY_DSN);

async function main() {
  await reconciliationQueue.add(
    'tick',
    {},
    { repeat: { every: 5 * 60_000, immediately: true }, jobId: 'reconciliation-tick' },
  );

  logger.info('worker de payments levantado: reconciliation');
}

main().catch((error) => {
  logger.error({ err: error }, 'fallo arrancando worker de payments');
  process.exitCode = 1;
});
