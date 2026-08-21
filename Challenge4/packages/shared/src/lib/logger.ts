import { randomUUID } from 'node:crypto';
import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV !== 'production' && !isTest;

/**
 * Cada servicio crea su propio logger base con createLogger(serviceName) para
 * que "service" quede en cada linea de log — asi se puede filtrar por
 * servicio en un agregador central (CloudWatch, Loki, etc.) sin tener que
 * adivinar de que proceso vino cada linea.
 */
export function createLogger(serviceName: string) {
  return pino(
    isDev
      ? { level: 'info', transport: { target: 'pino-pretty' }, base: { service: serviceName } }
      : { level: isTest ? 'silent' : 'info', base: { service: serviceName } },
  );
}

export const genReqId = (): string => randomUUID();

export function childLogger(logger: pino.Logger, requestId: string) {
  return logger.child({ request_id: requestId });
}
