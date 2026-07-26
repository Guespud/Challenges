import { z } from 'zod';

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date debe tener formato YYYY-MM-DD'),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const appointmentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const adminAppointmentsQuerySchema = z.object({
  status: z
    .enum(['pending', 'confirmed', 'paid', 'reminded', 'completed', 'cancelled', 'no_show'])
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
