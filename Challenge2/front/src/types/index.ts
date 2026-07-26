export type Role = 'patient' | 'nutritionist';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface HabitEntry {
  id: string;
  patientId: string;
  date: string;
  waterMl: number;
  exerciseMin: number;
  sleepHours: number;
  createdAt: string;
}

export interface PatientSummary {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
