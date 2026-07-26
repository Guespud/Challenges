import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken, type TokenPayload } from '../lib/jwt.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import content from '../content/es.json' with { type: 'json' };

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    throw unauthorized();
  }

  try {
    request.user = verifyAccessToken(token);
  } catch {
    throw unauthorized(content.errors.invalidToken);
  }
}

export function requireRole(role: TokenPayload['role']) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (request.user?.role !== role) {
      throw forbidden();
    }
  };
}
