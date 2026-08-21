import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  appointmentId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  serviceName: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
