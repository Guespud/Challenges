import type { FastifyReply, FastifyRequest } from 'fastify';
import { forbidden } from '../lib/errors.js';

/**
 * Rutas /internal/* son servicio-a-servicio, nunca deberían llegar por el
 * gateway público (que solo enruta paths conocidos de cara al usuario). Esto
 * es una segunda barrera barata (secreto compartido por header) por si el
 * gateway se configura mal o alguien pega directo al puerto del servicio.
 * No reemplaza tener el servicio en una red privada en un deploy real — eso
 * va en el ADR de despliegue.
 */
export function createInternalGuard(sharedSecret: string) {
  return async function requireInternalToken(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const token = request.headers['x-internal-token'];
    if (token !== sharedSecret) {
      throw forbidden();
    }
  };
}
