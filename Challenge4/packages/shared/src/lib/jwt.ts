import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
  role: 'patient' | 'doctor' | 'staff';
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

/**
 * Firmar tokens solo lo hace Auth (dueño de JWT_ACCESS_SECRET/JWT_REFRESH_SECRET
 * como secretos de escritura). Verificar un access token lo necesita
 * cualquier servicio detras del gateway, por eso el secreto se recibe como
 * parametro en vez de leerse de un env.ts especifico de un servicio - cada
 * servicio solo necesita conocer JWT_ACCESS_SECRET (verificacion), nunca
 * JWT_REFRESH_SECRET (eso es exclusivo de Auth).
 */
export function signAccessToken(payload: TokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: TokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}

export function verifyRefreshToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}
