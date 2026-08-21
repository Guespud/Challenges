import { apiRequest } from '../../../core/api';
import type { Appointment } from '../../../types';

export const agendaApi = {
  mine: () => apiRequest<Appointment[]>('/doctors/me/agenda'),
};
