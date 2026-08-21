import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';

const SALT_ROUNDS = 10;

async function upsertUser(email: string, name: string, role: 'patient' | 'doctor' | 'staff', password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
  console.log(`${role} listo: ${user.email} / ${password}`);
  return user;
}

async function upsertAvailability(doctorId: string, dayOfWeek: number) {
  const existing = await prisma.doctorAvailability.findFirst({ where: { doctorId, dayOfWeek } });
  if (existing) return;

  await prisma.doctorAvailability.create({
    data: { doctorId, dayOfWeek, startTime: '09:00', endTime: '17:00', slotDurationMin: 30 },
  });
}

async function upsertService(name: string, durationMin: number, priceCents: number) {
  const existing = await prisma.service.findFirst({ where: { name } });
  if (existing) return;

  await prisma.service.create({ data: { name, durationMin, priceCents } });
}

async function main() {
  const doctor = await upsertUser('doctora@vitalis-clinic.test', 'Dra. Vitalis', 'doctor', 'Vitalis#2026');
  await upsertUser('staff@vitalis-clinic.test', 'Recepción Vitalis', 'staff', 'Vitalis#2026');
  await upsertUser('alejo@yopmail.com', 'Alejo', 'patient', 'Alejo#2026');

  // Lunes a viernes, 9:00–17:00, slots de 30 min.
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    await upsertAvailability(doctor.id, dayOfWeek);
  }

  await upsertService('Consulta general', 30, 60000);
  await upsertService('Consulta de seguimiento', 30, 40000);

  console.log('Servicios y disponibilidad sembrados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
