import type { FastifyInstance } from 'fastify';
import { habitHistoryQuerySchema } from '../schemas/habit.schema.js';
import { parse } from '../lib/validate.js';
import { requireRole } from '../plugins/auth.js';
import * as patientService from '../services/patient.service.js';

export async function patientsRoutes(app: FastifyInstance): Promise<void> {
  const nutritionistOnly = requireRole('nutritionist');

  app.get('/patients', { preHandler: nutritionistOnly }, async (_request, reply) => {
    const patients = await patientService.listPatients();
    reply.send(patients);
  });

  app.get<{ Params: { id: string } }>(
    '/patients/:id/habits',
    { preHandler: nutritionistOnly },
    async (request, reply) => {
      const { days } = parse(habitHistoryQuerySchema, request.query);
      const history = await patientService.getPatientHabits(request.params.id, days);
      reply.send(history);
    },
  );
}
