import { z } from 'zod';
import { isStrongPassword } from './password-rules';
import content from '../../../content/es.json';

const { validation } = content;

const strongPassword = z
  .string()
  .trim()
  .min(8, validation.password.min)
  .refine(isStrongPassword, validation.password.weak);

export const registerSchema = z.object({
  email: z.string().trim().email({ error: validation.email.invalid }),
  password: strongPassword,
  name: z.string().trim().min(1, validation.required),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().trim().min(1, validation.required) })
  .refine((data) => data.password === data.confirmPassword, {
    message: validation.password.mismatch,
    path: ['confirmPassword'],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email({ error: validation.email.invalid }),
  password: z.string().trim().min(1, validation.required),
});
export type LoginInput = z.infer<typeof loginSchema>;
