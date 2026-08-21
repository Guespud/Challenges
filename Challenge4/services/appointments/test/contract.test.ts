import { createContractChecker, signAccessToken } from '@vitalis/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const { check } = createContractChecker('appointments.yaml');

// Mismos UUIDs fijos que prisma/seed.ts — la base de test ya está sembrada
// (ver services/appointments/prisma/seed.ts) antes de correr este archivo.
const SEED_IDS = {
  doctor: '11111111-1111-4111-8111-111111111111',
  staff: '22222222-2222-4222-8222-222222222222',
  patient: '33333333-3333-4333-8333-333333333333',
};

const SECRET = process.env.JWT_ACCESS_SECRET!;
const patientToken = signAccessToken({ sub: SEED_IDS.patient, role: 'patient' }, SECRET);
const staffToken = signAccessToken({ sub: SEED_IDS.staff, role: 'staff' }, SECRET);

afterAll(async () => {
  await prisma.$disconnect();
});

describe('contrato OpenAPI — appointments', () => {
  it('GET /doctors (200) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/doctors',
      headers: { authorization: `Bearer ${patientToken}` },
    });

    expect(response.statusCode).toBe(200);
    check({ method: 'GET', path: '/doctors', statusCode: 200, body: response.json() });
    await app.close();
  });

  it('GET /doctors/{id}/availability (200) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/doctors/${SEED_IDS.doctor}/availability?date=2026-08-24`,
      headers: { authorization: `Bearer ${patientToken}` },
    });

    expect(response.statusCode).toBe(200);
    check({ method: 'GET', path: '/doctors/{id}/availability', statusCode: 200, body: response.json() });
    await app.close();
  });

  it('GET /appointments/me (200) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/appointments/me',
      headers: { authorization: `Bearer ${patientToken}` },
    });

    expect(response.statusCode).toBe(200);
    check({ method: 'GET', path: '/appointments/me', statusCode: 200, body: response.json() });
    await app.close();
  });

  it('GET /admin/appointments (200, staff) cumple el contrato', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/admin/appointments',
      headers: { authorization: `Bearer ${staffToken}` },
    });

    expect(response.statusCode).toBe(200);
    check({ method: 'GET', path: '/admin/appointments', statusCode: 200, body: response.json() });
    await app.close();
  });

  it('POST /appointments (503, Payments no disponible en este entorno de test) cumple el contrato', async () => {
    const app = await buildApp();
    const service = await prisma.service.findFirstOrThrow();

    // Horario aleatorio dentro de un rango amplio de años futuros: cada
    // corrida de este test deja una fila real en la base de test (no hay
    // rollback porque createAppointment de verdad hace commit antes de
    // fallar al llamar a Payments) — una fecha fija chocaría con la del
    // run anterior como slot ya ocupado (409) en vez de probar el 503 real.
    const randomYear = 2030 + Math.floor(Math.random() * 20);
    const randomDay = 1 + Math.floor(Math.random() * 27);
    const startsAt = `${randomYear}-01-${String(randomDay).padStart(2, '0')}T15:00:00.000Z`;

    const response = await app.inject({
      method: 'POST',
      url: '/appointments',
      headers: { authorization: `Bearer ${patientToken}` },
      payload: {
        doctorId: SEED_IDS.doctor,
        serviceId: service.id,
        startsAt,
      },
    });

    // Nada escucha en PAYMENTS_SERVICE_URL durante este test — es
    // exactamente el escenario del ADR-009/010 (Payments caído), y el
    // contrato declara 503 para ese caso.
    expect(response.statusCode).toBe(503);
    check({ method: 'POST', path: '/appointments', statusCode: 503, body: response.json() });
    await app.close();
  });
});
