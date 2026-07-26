import { apiRequest } from '../../../core/api';
import type { Appointment } from '../../../types';

export const appointmentsApi = {
  create: (input: { doctorId: string; serviceId: string; startsAt: string }) =>
    apiRequest<{ appointment: Appointment; checkoutUrl: string }>('/appointments', {
      method: 'POST',
      body: input,
    }),

  mine: () => apiRequest<Appointment[]>('/appointments/me'),

  cancel: (id: string) => apiRequest<Appointment>(`/appointments/${id}/cancel`, { method: 'POST' }),
};
