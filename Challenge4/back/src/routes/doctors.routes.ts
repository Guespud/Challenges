import type { FastifyInstance } from 'fastify';
import { authenticate, requireRole } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { appointmentIdParamsSchema, availabilityQuerySchema } from '../schemas/appointment.schema.js';
import { getAvailableSlots } from '../services/availability.service.js';
import * as doctorService from '../services/doctor.service.js';
import * as appointmentService from '../services/appointment.service.js';

export async function doctorsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/doctors', { preHandler: authenticate }, async (_request, reply) => {
    const result = await doctorService.listDoctors();
    reply.send(result);
  });

  app.get('/doctors/:id/availability', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parse(appointmentIdParamsSchema, request.params);
    const { date } = parse(availabilityQuerySchema, request.query);
    const slots = await getAvailableSlots(id, new Date(`${date}T00:00:00.000Z`));
    reply.send({ slots });
  });

  app.get('/doctors/me/agenda', { preHandler: requireRole('doctor') }, async (request, reply) => {
    const agenda = await appointmentService.listMyAgendaAsDoctor(request.user!.sub);
    reply.send(agenda);
  });
}
