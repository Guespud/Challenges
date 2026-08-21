import type { FastifyInstance } from 'fastify';
import { parse } from '@vitalis/shared';
import { requireInternalToken } from '../plugins/internal.js';
import { createCheckoutSessionSchema } from '../schemas/checkout.schema.js';
import * as paymentService from '../services/payment.service.js';

/**
 * Llamadas servicio-a-servicio desde Appointments. Nunca las llama el
 * frontend directo — el gateway no expone /internal/* públicamente (ver
 * gateway/src/routes).
 */
export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post('/internal/checkout-sessions', { preHandler: requireInternalToken }, async (request, reply) => {
    const input = parse(createCheckoutSessionSchema, request.body);
    const result = await paymentService.createCheckoutSession(input);
    reply.code(201).send(result);
  });

  app.post<{ Params: { appointmentId: string } }>(
    '/internal/payments/:appointmentId/refund',
    { preHandler: requireInternalToken },
    async (request, reply) => {
      const result = await paymentService.refundPayment(request.params.appointmentId);
      reply.send(result);
    },
  );
}
