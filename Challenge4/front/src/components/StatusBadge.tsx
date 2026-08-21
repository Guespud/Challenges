import type { AppointmentStatus } from '../types';
import content from '../content/es.json';

const { status: labels } = content.appointments;

const styles: Record<AppointmentStatus, string> = {
  pending: 'bg-neutral-100 text-neutral-600',
  confirmed: 'bg-blue-50 text-blue-700',
  paid: 'bg-blue-50 text-blue-700',
  reminded: 'bg-blue-100 text-blue-800',
  completed: 'bg-neutral-900 text-white',
  cancelled: 'bg-neutral-200 text-neutral-500',
  no_show: 'bg-neutral-200 text-neutral-500',
};

export function StatusBadge({ status }: { readonly status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
