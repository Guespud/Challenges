import type { FastifyInstance } from 'fastify';
import { requireRole } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { adminAppointmentsQuerySchema, appointmentIdParamsSchema } from '../schemas/appointment.schema.js';
import * as adminService from '../services/admin.service.js';
import * as appointmentService from '../services/appointment.service.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/appointments', { preHandler: requireRole('staff') }, async (request, reply) => {
    const query = parse(adminAppointmentsQuerySchema, request.query);
    const appointments = await adminService.listAppointments(query);
    reply.send(appointments);
  });

  app.get('/admin/appointments/:id/events', { preHandler: requireRole('staff') }, async (request, reply) => {
    const { id } = parse(appointmentIdParamsSchema, request.params);
    const events = await adminService.getAppointmentEvents(id);
    reply.send(events);
  });

  app.post('/admin/appointments/:id/cancel', { preHandler: requireRole('staff') }, async (request, reply) => {
    const { id } = parse(appointmentIdParamsSchema, request.params);
    const appointment = await appointmentService.cancelAppointment(id, {
      id: request.user!.sub,
      role: 'staff',
    });
    reply.send(appointment);
  });
}
