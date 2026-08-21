import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional());
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: optionalUrl,
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  APPOINTMENTS_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  PAYMENTS_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  SENTRY_DSN: optionalString,
});

export const env = envSchema.parse(process.env);
