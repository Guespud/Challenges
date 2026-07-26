import { randomUUID } from 'node:crypto';
import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV !== 'production' && !isTest;

export const logger = pino(
  isDev
    ? { level: 'info', transport: { target: 'pino-pretty' } }
    : { level: isTest ? 'silent' : 'info' },
);

export const genReqId = (): string => randomUUID();

export function workerLogger(requestId: string) {
  return logger.child({ request_id: requestId });
}
