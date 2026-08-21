import bcrypt from 'bcrypt';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  unauthorized,
  unprocessable,
  sharedContent,
  EVENT_STREAMS,
  type UserRegisteredPayload,
} from '@vitalis/shared';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { eventPublisher } from '../lib/events.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

const { errors } = sharedContent;

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput, requestId: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw unprocessable(errors.emailAlreadyRegistered);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'patient',
    },
  });

  // Appointments (y quien más lo necesite) consume esto para actualizar su
  // proyección local {id, name, email, role} sin llamar a Auth por HTTP en
  // cada request — ver RFC-001.
  await eventPublisher.publish<UserRegisteredPayload>(EVENT_STREAMS.userRegistered, {
    type: 'UserRegistered',
    requestId,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw unauthorized(errors.invalidCredentials);
  }

  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: signAccessToken(payload, env.JWT_ACCESS_SECRET),
    refreshToken: signRefreshToken(payload, env.JWT_REFRESH_SECRET),
  };
}

export function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw unauthorized(errors.invalidRefreshToken);
  }

  return { accessToken: signAccessToken({ sub: payload.sub, role: payload.role }, env.JWT_ACCESS_SECRET) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw unauthorized(errors.userNotFound);
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
