import type { Role } from '../types';

export function homePathForRole(role: Role): string {
  switch (role) {
    case 'patient':
      return '/paciente';
    case 'staff':
      return '/staff';
    case 'doctor':
      return '/medico';
  }
}
