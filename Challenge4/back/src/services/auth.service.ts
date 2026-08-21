import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { unauthorized, unprocessable } from '../lib/errors.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import content from '../content/es.json' with { type: 'json' };

const { errors } = content;

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput) {
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
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized(errors.invalidRefreshToken);
  }

  return { accessToken: signAccessToken({ sub: payload.sub, role: payload.role }) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw unauthorized(errors.userNotFound);
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
