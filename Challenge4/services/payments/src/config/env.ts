import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  INTERNAL_SERVICE_TOKEN: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3003),
  SENTRY_DSN: optionalString,
});

export const env = envSchema.parse(process.env);
