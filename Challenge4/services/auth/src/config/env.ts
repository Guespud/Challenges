import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Railway (y otros PaaS) dejan variables "declaradas pero vacías" cuando
// referencian un servicio que todavía no existe. Sin esto, Zod trata "" como
// un valor presente y z.string().url() lo rechaza, aunque sea .optional().
const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional());
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: optionalUrl,
  SENTRY_DSN: optionalString,
});

export const env = envSchema.parse(process.env);
