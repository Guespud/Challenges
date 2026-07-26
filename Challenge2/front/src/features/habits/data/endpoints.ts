import { apiRequest } from '../../../core/api';
import type { HabitEntryInput } from './habit.schema';
import type { HabitEntry } from '../../../types';

export const habitApi = {
  upsert: (input: HabitEntryInput) => apiRequest<HabitEntry>('/habits', { method: 'POST', body: input }),

  history: (days = 30) => apiRequest<HabitEntry[]>('/habits/me', { query: { days } }),
};
