import { z } from 'zod';
import content from '../content/es.json' with { type: 'json' };

export const habitEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, content.validation.habit.dateFormat),
  water_ml: z.number().int().min(0),
  exercise_min: z.number().int().min(0),
  sleep_hours: z.number().min(0).max(24),
});
export type HabitEntryInput = z.infer<typeof habitEntrySchema>;

export const habitHistoryQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});
export type HabitHistoryQuery = z.infer<typeof habitHistoryQuerySchema>;
