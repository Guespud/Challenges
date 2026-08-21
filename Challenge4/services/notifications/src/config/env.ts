import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());

const envSchema = z.object({
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1).default('citas@vitalis-clinic.test'),
  SENTRY_DSN: optionalString,
});

export const env = envSchema.parse(process.env);
