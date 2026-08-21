export type Role = 'patient' | 'doctor' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Doctor {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

export interface Slot {
  startsAt: string;
  endsAt: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'reminded'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  service?: Service;
  doctor?: { id: string; name: string };
  patient?: { id: string; name: string; email: string };
}

export interface AppointmentEvent {
  id: string;
  appointmentId: string;
  type: string;
  payload?: unknown;
  createdAt: string;
}
