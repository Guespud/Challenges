import { randomUUID } from 'node:crypto';
import { createContractChecker } from '@vitalis/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

// Contract test: valida que las respuestas reales del servicio (capturadas
// con app.inject(), sin levantar un puerto de verdad) cumplen el schema que
// docs/openapi/auth.yaml declara para cada operación. Esto es lo que
// convierte el contrato en algo que el CI rompe si el código y el YAML se
// desalinean, en vez de documentación que nadie vuelve a mirar.
const { check } = createContractChecker('auth.yaml');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('contrato OpenAPI — auth', () => {
  it('POST /auth/register (201) cumple el contrato', async () => {
    const app = await buildApp();
    const email = `contract-${randomUUID()}@test.com`;

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password: 'Test#2026', name: 'Contract Test' },
    });

    expect(response.statusCode).toBe(201);
    check({ method: 'POST', path: '/auth/register', statusCode: 201, body: response.json() });
    await app.close();
  });

  it('POST /auth/register (422, email duplicado) cumple el contrato', async () => {
    const app = await buildApp();
    const email = `contract-dup-${randomUUID()}@test.com`;
    const payload = { email, password: 'Test#2026', name: 'Contract Test' };

    await app.inject({ method: 'POST', url: '/auth/register', payload });
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload });

    expect(response.statusCode).toBe(422);
    check({ method: 'POST', path: '/auth/register', statusCode: 422, body: response.json() });
    await app.close();
  });

  it('POST /auth/login (200) cumple el contrato', async () => {
    const app = await buildApp();
    const email = `contract-login-${randomUUID()}@test.com`;
    const password = 'Test#2026';
    await app.inject({ method: 'POST', url: '/auth/register', payload: { email, password, name: 'Login Test' } });

    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });

    expect(response.statusCode).toBe(200);
    check({ method: 'POST', path: '/auth/login', statusCode: 200, body: response.json() });
    await app.close();
  });

  it('POST /auth/login (401, credenciales inválidas) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `nope-${randomUUID()}@test.com`, password: 'wrong' },
    });

    expect(response.statusCode).toBe(401);
    check({ method: 'POST', path: '/auth/login', statusCode: 401, body: response.json() });
    await app.close();
  });

  it('GET /me (200) cumple el contrato', async () => {
    const app = await buildApp();
    const email = `contract-me-${randomUUID()}@test.com`;
    const password = 'Test#2026';
    await app.inject({ method: 'POST', url: '/auth/register', payload: { email, password, name: 'Me Test' } });
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
    const { accessToken } = login.json();

    const response = await app.inject({ method: 'GET', url: '/me', headers: { authorization: `Bearer ${accessToken}` } });

    expect(response.statusCode).toBe(200);
    check({ method: 'GET', path: '/me', statusCode: 200, body: response.json() });
    await app.close();
  });
});
