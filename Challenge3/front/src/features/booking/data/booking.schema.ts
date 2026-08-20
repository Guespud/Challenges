import { z } from 'zod';
import content from '../../../content/es.json';

const { validation, booking } = content;

export const bookingSchema = z.object({
  doctorId: z.string().min(1, validation.required),
  serviceId: z.string().min(1, validation.required),
  date: z.string().min(1, validation.required),
  slot: z.string().min(1, booking.slotRequired),
});
export type BookingInput = z.infer<typeof bookingSchema>;
