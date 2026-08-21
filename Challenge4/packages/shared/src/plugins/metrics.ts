import type { FastifyInstance } from 'fastify';
import client from 'prom-client';

/**
 * Métricas RED (Rate, Errors, Duration) por servicio, expuestas en /metrics
 * en formato Prometheus. Un registro por proceso (no global) para que cada
 * servicio tenga sus propias series, sin pisarse entre sí dentro del mismo
 * contenedor (auth, appointments, etc. corren en procesos separados de
 * cualquier forma, pero esto evita registrar el default global de
 * prom-client dos veces si createApp se llama más de una vez en tests).
 */
export function registerMetrics(app: FastifyInstance, serviceName: string): void {
  const register = new client.Registry();
  register.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register });

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de requests HTTP en segundos (Duration de RED)',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
  });

  const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total de requests HTTP (Rate de RED)',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  const httpRequestErrorsTotal = new client.Counter({
    name: 'http_request_errors_total',
    help: 'Total de requests HTTP que terminaron en 4xx/5xx (Errors de RED)',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  app.addHook('onResponse', async (request, reply) => {
    // request.routeOptions.url es el path con params sin interpolar
    // (ej. "/appointments/:id/cancel"), no la URL real con el UUID —
    // así las series no explotan en cardinalidad por cada id distinto.
    const route = request.routeOptions?.url ?? request.url;
    const labels = { method: request.method, route, status_code: String(reply.statusCode) };

    httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
    httpRequestsTotal.inc(labels);
    if (reply.statusCode >= 400) {
      httpRequestErrorsTotal.inc(labels);
    }
  });

  app.get('/metrics', async (_request, reply) => {
    reply.header('content-type', register.contentType);
    return register.metrics();
  });
}
