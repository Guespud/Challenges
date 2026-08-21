import { apiRequest } from '../../../core/api';
import type { Doctor, Service, Slot } from '../../../types';

export const doctorsApi = {
  list: () => apiRequest<{ doctors: Doctor[]; services: Service[] }>('/doctors'),

  availability: (doctorId: string, date: string) =>
    apiRequest<{ slots: Slot[] }>(`/doctors/${doctorId}/availability`, { query: { date } }),
};
