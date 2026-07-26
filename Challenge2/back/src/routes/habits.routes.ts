import type { FastifyInstance } from 'fastify';
import { habitEntrySchema, habitHistoryQuerySchema } from '../schemas/habit.schema.js';
import { parse } from '../lib/validate.js';
import { requireRole } from '../plugins/auth.js';
import * as habitService from '../services/habit.service.js';

export async function habitsRoutes(app: FastifyInstance): Promise<void> {
  const patientOnly = requireRole('patient');

  app.post('/habits', { preHandler: patientOnly }, async (request, reply) => {
    const input = parse(habitEntrySchema, request.body);
    const { entry, created } = await habitService.upsertHabitEntry(request.user!.sub, input);
    reply.code(created ? 201 : 200).send(entry);
  });

  app.get('/habits/me', { preHandler: patientOnly }, async (request, reply) => {
    const { days } = parse(habitHistoryQuerySchema, request.query);
    const history = await habitService.listHabitHistory(request.user!.sub, days);
    reply.send(history);
  });
}
