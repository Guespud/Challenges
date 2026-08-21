import { randomUUID } from 'node:crypto';
import { createContractChecker } from '@vitalis/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const { check } = createContractChecker('payments.yaml');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('contrato OpenAPI — payments', () => {
  it('POST /webhooks/stripe (400, sin firma) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      payload: JSON.stringify({ type: 'checkout.session.completed' }),
      headers: { 'content-type': 'application/json' },
    });

    expect(response.statusCode).toBe(400);
    check({ method: 'POST', path: '/webhooks/stripe', statusCode: 400, body: response.json() });
    await app.close();
  });

  it('POST /internal/checkout-sessions (403, sin token interno) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/internal/checkout-sessions',
      payload: {
        appointmentId: randomUUID(),
        amountCents: 1000,
        serviceName: 'x',
        successUrl: 'http://x.test/ok',
        cancelUrl: 'http://x.test/cancel',
      },
    });

    expect(response.statusCode).toBe(403);
    check({ method: 'POST', path: '/internal/checkout-sessions', statusCode: 403, body: response.json() });
    await app.close();
  });

  it('POST /internal/payments/{appointmentId}/refund (403, sin token interno) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({ method: 'POST', url: `/internal/payments/${randomUUID()}/refund` });

    expect(response.statusCode).toBe(403);
    check({ method: 'POST', path: '/internal/payments/{appointmentId}/refund', statusCode: 403, body: response.json() });
    await app.close();
  });

  it('POST /internal/payments/{appointmentId}/refund (404, no hay pago) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: `/internal/payments/${randomUUID()}/refund`,
      headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN! },
    });

    expect(response.statusCode).toBe(404);
    check({ method: 'POST', path: '/internal/payments/{appointmentId}/refund', statusCode: 404, body: response.json() });
    await app.close();
  });
});
