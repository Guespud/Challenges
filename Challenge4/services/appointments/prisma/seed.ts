import { prisma } from '../src/lib/prisma.js';

// Mismos UUIDs fijos que services/auth/prisma/seed.ts (SEED_IDS) — sin esto
// no hay forma de que Appointments sepa a qué doctor referenciar sin
// consultar la base de Auth. En producción real esto no haría falta: el
// consumer de UserRegistered puebla la proyección solo con datos reales.
const SEED_IDS = {
  doctor: '11111111-1111-4111-8111-111111111111',
  staff: '22222222-2222-4222-8222-222222222222',
  patient: '33333333-3333-4333-8333-333333333333',
} as const;

async function seedUserProjection() {
  await prisma.userProjection.upsert({
    where: { id: SEED_IDS.doctor },
    update: { name: 'Dra. Vitalis', email: 'doctora@vitalis-clinic.test' },
    create: { id: SEED_IDS.doctor, name: 'Dra. Vitalis', email: 'doctora@vitalis-clinic.test', role: 'doctor' },
  });
  await prisma.userProjection.upsert({
    where: { id: SEED_IDS.staff },
    update: { name: 'Recepción Vitalis', email: 'staff@vitalis-clinic.test' },
    create: { id: SEED_IDS.staff, name: 'Recepción Vitalis', email: 'staff@vitalis-clinic.test', role: 'staff' },
  });
  // alejo.habbacuc@gmail.com (no yopmail): Resend en modo sandbox, sin
  // dominio propio verificado, solo entrega al email dueño de la cuenta.
  await prisma.userProjection.upsert({
    where: { id: SEED_IDS.patient },
    update: { name: 'Alejo', email: 'alejo.habbacuc@gmail.com' },
    create: { id: SEED_IDS.patient, name: 'Alejo', email: 'alejo.habbacuc@gmail.com', role: 'patient' },
  });
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
  await seedUserProjection();

  // Lunes a viernes, 9:00–17:00, slots de 30 min.
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    await upsertAvailability(SEED_IDS.doctor, dayOfWeek);
  }

  await upsertService('Consulta general', 30, 60000);
  await upsertService('Consulta de seguimiento', 30, 40000);

  console.log('Proyección de usuarios, servicios y disponibilidad sembrados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
