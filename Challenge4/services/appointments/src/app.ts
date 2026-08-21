import { createApp } from '@vitalis/shared';
import { env } from './config/env.js';
import { appointmentsRoutes } from './routes/appointments.routes.js';
import { doctorsRoutes } from './routes/doctors.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

export async function buildApp() {
  return createApp({
    serviceName: 'appointments',
    sentryDsn: env.SENTRY_DSN,
    corsOrigin: env.FRONTEND_URL ?? true,
    openapiFileName: 'appointments.yaml',
    registerRoutes: async (app) => {
      await app.register(appointmentsRoutes);
      await app.register(doctorsRoutes);
      await app.register(adminRoutes);
    },
  });
}
