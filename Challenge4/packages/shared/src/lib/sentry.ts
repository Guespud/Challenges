import * as Sentry from '@sentry/node';

/**
 * A diferencia del monolito (que leia env.SENTRY_DSN directo), esta version
 * recibe el DSN y el nombre del servicio como parametros: cada servicio tiene
 * su propio env.ts, y el "environment" que reporta a Sentry identifica de que
 * servicio vino el error.
 */
export function initSentry(serviceName: string, dsn: string | undefined): void {
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: `${process.env.NODE_ENV ?? 'development'}:${serviceName}`,
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
