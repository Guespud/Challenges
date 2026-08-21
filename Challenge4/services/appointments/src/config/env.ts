import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional());
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  // Solo verifica tokens (nunca firma) — mismo secreto que JWT_ACCESS_SECRET en Auth.
  JWT_ACCESS_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3002),
  FRONTEND_URL: optionalUrl,
  PAYMENTS_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  INTERNAL_SERVICE_TOKEN: z.string().min(1),
  SENTRY_DSN: optionalString,
  HOLD_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REMINDER_HOURS_BEFORE: z.coerce.number().int().positive().default(24),
});

export const env = envSchema.parse(process.env);
