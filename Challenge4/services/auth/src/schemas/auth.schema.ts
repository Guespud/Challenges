import { z } from 'zod';
import { sharedContent } from '@vitalis/shared';

const { password: passwordText } = sharedContent.validation;

const strongPassword = z
  .string()
  .trim()
  .refine((v) => v.length >= 8, passwordText.min)
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
