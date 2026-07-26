import { config } from 'dotenv';
import { z } from 'zod';

// Tests corren contra su propia base (.env.test) para no ensuciar los datos
// de `npm run dev` — ver .env.test.example.
config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().optional(),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1).default('citas@vitalis-clinic.test'),
  SENTRY_DSN: z.string().optional(),
  HOLD_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REMINDER_HOURS_BEFORE: z.coerce.number().int().positive().default(24),
});

export const env = envSchema.parse(process.env);
