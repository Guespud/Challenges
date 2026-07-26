import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './lib/errors.js';
import { env } from './config/env.js';
import { logger, genReqId } from './lib/logger.js';
import { initSentry, Sentry } from './lib/sentry.js';
import content from './content/es.json' with { type: 'json' };
import { authRoutes } from './routes/auth.routes.js';
import { meRoutes } from './routes/me.routes.js';
import { doctorsRoutes } from './routes/doctors.routes.js';
import { appointmentsRoutes } from './routes/appointments.routes.js';
import { webhooksRoutes } from './routes/webhooks.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

export async function buildApp() {
  initSentry();

  // `logger` (pino) ya nace en nivel 'silent' cuando NODE_ENV=test — ver src/lib/logger.ts.
  const app = Fastify({
    loggerInstance: logger,
    genReqId,
    requestIdLogLabel: 'request_id',
  });

  await app.register(cors, { origin: env.FRONTEND_URL ?? true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
      return;
    }

    app.log.error({ err: error, request_id: request.id }, 'unhandled error');
    Sentry.captureException(error);
    reply.code(500).send({ error: content.errors.internalServer, statusCode: 500 });
  });

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(doctorsRoutes);
  await app.register(appointmentsRoutes);
  await app.register(webhooksRoutes);
  await app.register(adminRoutes);

  return app;
}
