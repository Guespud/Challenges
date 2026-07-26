import { prisma } from '../lib/prisma.js';

export async function listDoctors() {
  const doctors = await prisma.user.findMany({
    where: { role: 'doctor' },
    select: { id: true, name: true },
  });
  const services = await prisma.service.findMany();
  return { doctors, services };
}
