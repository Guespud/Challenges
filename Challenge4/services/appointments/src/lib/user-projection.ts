import { prisma } from './prisma.js';
import type { UserRegisteredPayload } from '@vitalis/shared';

/** Llamado por el consumer de UserRegistered — ver workers/event-consumers.ts. */
export async function upsertUserProjection(user: UserRegisteredPayload): Promise<void> {
  await prisma.userProjection.upsert({
    where: { id: user.id },
    update: { name: user.name, email: user.email, role: user.role },
    create: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function getUsersByIds(ids: string[]): Promise<Map<string, { id: string; name: string; email: string }>> {
  const uniqueIds = [...new Set(ids)];
  const users = await prisma.userProjection.findMany({ where: { id: { in: uniqueIds } } });
  return new Map(users.map((u) => [u.id, { id: u.id, name: u.name, email: u.email }]));
}

export async function getUser(id: string): Promise<{ id: string; name: string; email: string } | null> {
  const user = await prisma.userProjection.findUnique({ where: { id } });
  return user ? { id: user.id, name: user.name, email: user.email } : null;
}

export async function listDoctorsProjection(): Promise<{ id: string; name: string }[]> {
  const doctors = await prisma.userProjection.findMany({ where: { role: 'doctor' }, select: { id: true, name: true } });
  return doctors;
}
