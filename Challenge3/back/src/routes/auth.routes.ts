import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, registerSchema } from '../schemas/auth.schema.js';
import { parse } from '../lib/validate.js';
import * as authService from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/register', async (request, reply) => {
    const input = parse(registerSchema, request.body);
    const user = await authService.register(input);
    reply.code(201).send(user);
  });

  app.post('/auth/login', async (request, reply) => {
    const input = parse(loginSchema, request.body);
    const tokens = await authService.login(input);
    reply.send(tokens);
  });

  app.post('/auth/refresh', async (request, reply) => {
    const input = parse(refreshSchema, request.body);
    const result = authService.refresh(input.refreshToken);
    reply.send(result);
  });
}
