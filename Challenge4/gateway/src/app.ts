import { createApp } from '@vitalis/shared';
import { env } from './config/env.js';
import { proxyRoutes } from './routes/proxy.routes.js';

export async function buildApp() {
  return createApp({
    serviceName: 'gateway',
    sentryDsn: env.SENTRY_DSN,
    corsOrigin: env.FRONTEND_URL ?? true,
    registerRoutes: proxyRoutes,
  });
}
