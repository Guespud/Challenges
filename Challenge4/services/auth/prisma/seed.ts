import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';

const SALT_ROUNDS = 10;

// IDs fijos a propósito: Appointments necesita referenciar al mismo
// doctorId/patientId en su propia base (sin FK real entre servicios), así
// que los seeds de ambos servicios usan estos mismos UUIDs. Ver
// docs/rfc/RFC-001-bounded-contexts.md.
export const SEED_IDS = {
  doctor: '11111111-1111-4111-8111-111111111111',
  staff: '22222222-2222-4222-8222-222222222222',
  patient: '33333333-3333-4333-8333-333333333333',
} as const;

async function upsertUser(id: string, email: string, name: string, role: 'patient' | 'doctor' | 'staff', password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { id },
    update: { email, name },
    create: { id, email, name, role, passwordHash },
  });
  console.log(`${role} listo: ${user.email} / ${password}`);
  return user;
}

async function main() {
  await upsertUser(SEED_IDS.doctor, 'doctora@vitalis-clinic.test', 'Dra. Vitalis', 'doctor', 'Vitalis#2026');
  await upsertUser(SEED_IDS.staff, 'staff@vitalis-clinic.test', 'Recepción Vitalis', 'staff', 'Vitalis#2026');
  // alejo.habbacuc@gmail.com (no yopmail): Resend en modo sandbox, sin
  // dominio propio verificado, solo entrega al email dueño de la cuenta.
  // Necesario para poder probar el envío real end-to-end.
  await upsertUser(SEED_IDS.patient, 'alejo.habbacuc@gmail.com', 'Alejo', 'patient', 'Alejo#2026');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
