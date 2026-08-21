import { createApp } from '@vitalis/shared';
import { env } from './config/env.js';
import { webhooksRoutes } from './routes/webhooks.routes.js';
import { internalRoutes } from './routes/internal.routes.js';

export async function buildApp() {
  return createApp({
    serviceName: 'payments',
    sentryDsn: env.SENTRY_DSN,
    openapiFileName: 'payments.yaml',
    registerRoutes: async (app) => {
      await app.register(webhooksRoutes);
      await app.register(internalRoutes);
    },
  });
}
