import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './lib/errors.js';
import { env } from './config/env.js';
import content from './content/es.json' with { type: 'json' };
import { authRoutes } from './routes/auth.routes.js';
import { meRoutes } from './routes/me.routes.js';
import { habitsRoutes } from './routes/habits.routes.js';
import { patientsRoutes } from './routes/patients.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: env.FRONTEND_URL ?? true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
      return;
    }

    app.log.error(error);
    reply.code(500).send({ error: content.errors.internalServer, statusCode: 500 });
  });

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(habitsRoutes);
  await app.register(patientsRoutes);

  return app;
}
