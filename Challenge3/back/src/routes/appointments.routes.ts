import type { FastifyInstance } from 'fastify';
import { authenticate, requireRole } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { appointmentIdParamsSchema, createAppointmentSchema } from '../schemas/appointment.schema.js';
import * as appointmentService from '../services/appointment.service.js';

export async function appointmentsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/appointments', { preHandler: requireRole('patient') }, async (request, reply) => {
    const input = parse(createAppointmentSchema, request.body);
    const result = await appointmentService.createAppointment({
      patientId: request.user!.sub,
      doctorId: input.doctorId,
      serviceId: input.serviceId,
      startsAt: input.startsAt,
      requestId: request.id,
    });
    reply.code(201).send({ appointment: result.appointment, checkoutUrl: result.checkoutUrl });
  });

  app.get('/appointments/me', { preHandler: requireRole('patient') }, async (request, reply) => {
    const appointments = await appointmentService.listMyAppointments(request.user!.sub);
    reply.send(appointments);
  });

  app.post('/appointments/:id/cancel', { preHandler: authenticate }, async (request, reply) => {
    const { id } = parse(appointmentIdParamsSchema, request.params);
    const appointment = await appointmentService.cancelAppointment(id, {
      id: request.user!.sub,
      role: request.user!.role,
    });
    reply.send(appointment);
  });
}
