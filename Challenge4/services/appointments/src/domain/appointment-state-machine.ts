import type { AppointmentStatus } from '@prisma/client';

/**
 * Ver diagrama de estados en SPEC.md. `pending` es un hold temporal, no una
 * reserva firme; el único disparador de `confirmed` es el evento
 * PaymentConfirmed que publica Payments.
 */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['reminded', 'cancelled'],
  reminded: ['completed', 'no_show', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Estados en los que la cita ocupa el slot del médico (bloquea disponibilidad). */
export const OCCUPYING_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'paid', 'reminded'];

/** Estados desde los que se puede cancelar (y, si aplica, disparar refund). */
export const CANCELLABLE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'paid', 'reminded'];

/** Estados que ya tuvieron un pago exitoso y por lo tanto requieren refund al cancelar. */
export const PAID_STATUSES: AppointmentStatus[] = ['paid', 'reminded'];
