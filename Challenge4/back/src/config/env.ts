import { config } from 'dotenv';
import { z } from 'zod';

// Tests corren contra su propia base (.env.test) para no ensuciar los datos
// de `npm run dev` — ver .env.test.example.
config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Railway (y otros PaaS) dejan variables "declaradas pero vacías" cuando
// referencian un servicio que todavía no existe (ej. FRONTEND_URL antes de
// desplegar el frontend). Sin esto, Zod trata "" como un valor presente y
// z.string().url() lo rechaza, aunque el campo sea .optional().
const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional());
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: optionalUrl,
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1).default('citas@vitalis-clinic.test'),
  SENTRY_DSN: optionalString,
  HOLD_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REMINDER_HOURS_BEFORE: z.coerce.number().int().positive().default(24),
});

export const env = envSchema.parse(process.env);
