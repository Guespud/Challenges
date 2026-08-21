import type { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { env } from '../config/env.js';

/**
 * Tabla de enrutamiento del gateway — la única URL pública que conoce el
 * frontend. Cada entrada es "todo lo que empiece con este prefijo va a este
 * servicio", preservando el path tal cual (rewritePrefix = prefix, no se
 * reescribe nada). /internal/* de Payments NUNCA se registra acá a
 * propósito: esas rutas son servicio-a-servicio (Appointments las llama
 * directo a PAYMENTS_SERVICE_URL), no deben quedar alcanzables desde afuera.
 */
const PLAIN_ROUTES: { prefix: string; upstream: string }[] = [
  { prefix: '/auth', upstream: env.AUTH_SERVICE_URL },
  { prefix: '/me', upstream: env.AUTH_SERVICE_URL },
  { prefix: '/doctors', upstream: env.APPOINTMENTS_SERVICE_URL },
  { prefix: '/appointments', upstream: env.APPOINTMENTS_SERVICE_URL },
  { prefix: '/admin', upstream: env.APPOINTMENTS_SERVICE_URL },
];

export async function proxyRoutes(app: FastifyInstance): Promise<void> {
  for (const route of PLAIN_ROUTES) {
    await app.register(httpProxy, {
      upstream: route.upstream,
      prefix: route.prefix,
      rewritePrefix: route.prefix,
    });
  }

  // /webhooks/stripe necesita llegar a Payments con el body crudo intacto
  // (Stripe firma el buffer exacto) — @fastify/http-proxy reenvía el stream
  // crudo sin que el gateway lo parsee, así que no hace falta un
  // content-type parser especial acá (a diferencia de Payments, que sí
  // necesita el suyo porque ES el que finalmente lee el body).
  await app.register(httpProxy, {
    upstream: env.PAYMENTS_SERVICE_URL,
    prefix: '/webhooks',
    rewritePrefix: '/webhooks',
  });
}
