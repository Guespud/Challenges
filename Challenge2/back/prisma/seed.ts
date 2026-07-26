import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';

const SALT_ROUNDS = 10;

async function upsertUser(email: string, name: string, role: 'patient' | 'nutritionist', password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
  console.log(`${role} listo: ${user.email} / ${password}`);
}

async function main() {
  await upsertUser('nutri@nutrifit.com', 'Dra. NutriFit', 'nutritionist', 'NutriFit#2026');
  await upsertUser('alejo@yopmail.com', 'Alejo', 'patient', 'Alejo#2026');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
