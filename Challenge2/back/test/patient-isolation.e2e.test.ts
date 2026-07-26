import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

let app: FastifyInstance;

async function registerAndLogin(email: string, password: string, name: string) {
  await app.inject({ method: 'POST', url: '/auth/register', payload: { email, password, name } });

  const loginRes = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  const { accessToken } = loginRes.json<{ accessToken: string }>();

  const meRes = await app.inject({ method: 'GET', url: '/me', headers: { authorization: `Bearer ${accessToken}` } });
  const me = meRes.json<{ id: string }>();

  return { accessToken, id: me.id };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('aislamiento entre pacientes', () => {
  const suffix = Date.now();
  const passwordA = 'Patient#A2026';
  const passwordB = 'Patient#B2026';

  it('el paciente A solo ve sus propios habitos, nunca los del paciente B', async () => {
    const patientA = await registerAndLogin(`patient-a-${suffix}@test.com`, passwordA, 'Patient A');
    const patientB = await registerAndLogin(`patient-b-${suffix}@test.com`, passwordB, 'Patient B');

    const date = '2026-01-15';

    await app.inject({
      method: 'POST',
      url: '/habits',
      headers: { authorization: `Bearer ${patientA.accessToken}` },
      payload: { date, water_ml: 1111, exercise_min: 11, sleep_hours: 1 },
    });

    await app.inject({
      method: 'POST',
      url: '/habits',
      headers: { authorization: `Bearer ${patientB.accessToken}` },
      payload: { date, water_ml: 2222, exercise_min: 22, sleep_hours: 2 },
    });

    const historyA = await app.inject({
      method: 'GET',
      url: '/habits/me?days=365',
      headers: { authorization: `Bearer ${patientA.accessToken}` },
    });
    const entriesA = historyA.json<{ patientId: string; waterMl: number }[]>();

    expect(entriesA.every((entry) => entry.patientId === patientA.id)).toBe(true);
    expect(entriesA.some((entry) => entry.waterMl === 2222)).toBe(false);
    expect(entriesA.some((entry) => entry.waterMl === 1111)).toBe(true);
  });

  it('un paciente no puede acceder a las rutas de la nutrióloga (403), aunque conozca el id de otro paciente', async () => {
    const patientA = await registerAndLogin(`patient-c-${suffix}@test.com`, passwordA, 'Patient C');
    const patientB = await registerAndLogin(`patient-d-${suffix}@test.com`, passwordB, 'Patient D');

    const listRes = await app.inject({
      method: 'GET',
      url: '/patients',
      headers: { authorization: `Bearer ${patientB.accessToken}` },
    });
    expect(listRes.statusCode).toBe(403);

    const detailRes = await app.inject({
      method: 'GET',
      url: `/patients/${patientA.id}/habits`,
      headers: { authorization: `Bearer ${patientB.accessToken}` },
    });
    expect(detailRes.statusCode).toBe(403);
  });

  it('el patientId de un POST /habits siempre sale del JWT, nunca del body', async () => {
    const patientA = await registerAndLogin(`patient-e-${suffix}@test.com`, passwordA, 'Patient E');
    const patientB = await registerAndLogin(`patient-f-${suffix}@test.com`, passwordB, 'Patient F');

    const res = await app.inject({
      method: 'POST',
      url: '/habits',
      headers: { authorization: `Bearer ${patientB.accessToken}` },
      payload: { date: '2026-01-16', water_ml: 1, exercise_min: 1, sleep_hours: 1, patientId: patientA.id },
    });
    const entry = res.json<{ patientId: string }>();

    expect(entry.patientId).toBe(patientB.id);
    expect(entry.patientId).not.toBe(patientA.id);
  });
});
