import { prisma } from '../lib/prisma.js';
import { listDoctorsProjection } from '../lib/user-projection.js';

export async function listDoctors() {
  const doctors = await listDoctorsProjection();
  const services = await prisma.service.findMany();
  return { doctors, services };
}
