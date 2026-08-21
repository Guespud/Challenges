import type { FastifyInstance } from 'fastify';
import { authenticate } from '../plugins/auth.js';
import * as authService from '../services/auth.service.js';

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const me = await authService.getMe(request.user!.sub);
    reply.send(me);
  });
}
