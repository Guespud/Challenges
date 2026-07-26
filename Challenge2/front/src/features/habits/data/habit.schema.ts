import { z } from 'zod';
import content from '../../../content/es.json';

const { habit } = content.validation;

export const habitEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, habit.date),
  water_ml: z.number().int().min(0, habit.nonNegative),
  exercise_min: z.number().int().min(0, habit.nonNegative),
  sleep_hours: z.number().min(0).max(24, habit.sleepMax),
});
export type HabitEntryInput = z.infer<typeof habitEntrySchema>;

export const habitFormSchema = habitEntrySchema.omit({ date: true });
export type HabitFormInput = z.infer<typeof habitFormSchema>;
