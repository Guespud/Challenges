import { apiRequest } from '../../../core/api';
import type { Appointment, AppointmentEvent, AppointmentStatus } from '../../../types';

export const adminAppointmentsApi = {
  list: (params: { status?: AppointmentStatus | ''; date?: string }) =>
    apiRequest<Appointment[]>('/admin/appointments', {
      query: { status: params.status || undefined, date: params.date || undefined },
    }),

  events: (id: string) => apiRequest<AppointmentEvent[]>(`/admin/appointments/${id}/events`),

  cancel: (id: string) => apiRequest<Appointment>(`/admin/appointments/${id}/cancel`, { method: 'POST' }),
};
