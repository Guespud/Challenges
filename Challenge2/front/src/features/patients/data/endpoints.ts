import { apiRequest } from '../../../core/api';
import type { HabitEntry, PatientSummary } from '../../../types';

export const patientApi = {
  list: () => apiRequest<PatientSummary[]>('/patients'),

  habits: (patientId: string, days = 30) =>
    apiRequest<HabitEntry[]>(`/patients/${patientId}/habits`, { query: { days } }),
};
