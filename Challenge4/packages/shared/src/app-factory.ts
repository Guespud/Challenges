import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './lib/errors.js';
import { createLogger, genReqId } from './lib/logger.js';
import { initSentry, Sentry } from './lib/sentry.js';
import { registerDocs } from './plugins/docs.js';
import { registerMetrics } from './plugins/metrics.js';
import sharedContent from './content/es.json' with { type: 'json' };

interface CreateAppOptions {
  /** Usado para taggear logs y el "environment" que le llega a Sentry. */
  serviceName: string;
  sentryDsn?: string;
  corsOrigin?: string | boolean;
  registerRoutes: (app: FastifyInstance) => Promise<void>;
  /** Nombre del archivo en docs/openapi/ (ej. "auth.yaml"). Si se pasa, sirve Swagger UI en /docs. */
  openapiFileName?: string;
}

/**
 * Bootstrap comun a los 4 servicios: logger, CORS, error handler uniforme
 * (AppError -> su statusCode, 4xx de Fastify se respetan, todo lo demas
 * cae a 500 + Sentry.captureException). Antes vivia duplicado en cada
 * app.ts del monolito partido; ahora cada servicio solo aporta su
 * serviceName y sus rutas.
 */
export async function createApp(options: CreateAppOptions) {
  initSentry(options.serviceName, options.sentryDsn);
  const logger = createLogger(options.serviceName);

  const app = Fastify({
    loggerInstance: logger,
    genReqId,
    requestIdLogLabel: 'request_id',
  });

  await app.register(cors, { origin: options.corsOrigin ?? true });

  registerMetrics(app as unknown as FastifyInstance, options.serviceName);

  if (options.openapiFileName) {
    await registerDocs(app as unknown as FastifyInstance, options.openapiFileName);
  }

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
      return;
    }

    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      reply.code(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
      return;
    }

    app.log.error({ err: error, request_id: request.id }, 'unhandled error');
    Sentry.captureException(error);
    reply.code(500).send({ error: sharedContent.errors.internalServer, statusCode: 500 });
  });

  // El cast es necesario porque `loggerInstance: logger` hace que TS infiera
  // un tipo de Logger mas especifico que el generico FastifyBaseLogger que
  // espera la firma de registerRoutes - sigue siendo un FastifyInstance real,
  // es friccion de tipos entre pino y los tipos por defecto de Fastify, no
  // un problema de type-safety real.
  await options.registerRoutes(app as unknown as FastifyInstance);

  return app;
}
