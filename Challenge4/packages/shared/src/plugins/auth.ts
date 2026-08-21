import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken, type TokenPayload } from '../lib/jwt.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import content from '../content/es.json' with { type: 'json' };

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

/**
 * Cada servicio llama createAuthGuards(env.JWT_ACCESS_SECRET) una vez al
 * levantar su Fastify instance y usa los preHandlers resultantes en sus
 * rutas. Ningun servicio (salvo Auth) necesita llamar a Auth por HTTP para
 * verificar un token - el JWT es autocontenido y el secreto de verificacion
 * (JWT_ACCESS_SECRET) es el unico dato de Auth que los demas servicios
 * conocen. Esto es lo que permite que el sistema siga respondiendo aunque
 * Auth este caido, mientras el token siga siendo valido.
 */
export function createAuthGuards(accessSecret: string) {
  async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) {
      throw unauthorized();
    }

    try {
      request.user = verifyAccessToken(token, accessSecret);
    } catch {
      throw unauthorized(content.errors.invalidToken);
    }
  }

  function requireRole(role: TokenPayload['role']) {
    return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      await authenticate(request, reply);
      if (request.user?.role !== role) {
        throw forbidden();
      }
    };
  }

  return { authenticate, requireRole };
}
