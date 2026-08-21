import { createApp } from '@vitalis/shared';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { meRoutes } from './routes/me.routes.js';

export async function buildApp() {
  return createApp({
    serviceName: 'auth',
    sentryDsn: env.SENTRY_DSN,
    corsOrigin: env.FRONTEND_URL ?? true,
    openapiFileName: 'auth.yaml',
    registerRoutes: async (app) => {
      await app.register(authRoutes);
      await app.register(meRoutes);
    },
  });
}
