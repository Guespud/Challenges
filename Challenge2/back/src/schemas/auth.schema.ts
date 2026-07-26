import { z } from 'zod';
import content from '../content/es.json' with { type: 'json' };

const { password: passwordText } = content.validation;

// .trim() guards against whitespace the client failed to strip (or a direct API call
// that never went through the frontend) — never trust the client, per the challenge spec.
const strongPassword = z
  .string()
  .trim()
  .min(8, passwordText.min)
  .refine((v) => /[A-Z]/.test(v), passwordText.uppercase)
  .refine((v) => /[a-z]/.test(v), passwordText.lowercase)
  .refine((v) => /\d/.test(v), passwordText.number)
  .refine((v) => /[^A-Za-z0-9]/.test(v), passwordText.special);

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: strongPassword,
  name: z.string().trim().min(1),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
