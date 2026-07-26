import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAppointmentsApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { ApiError } from '../../../core/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import { fieldClass } from '../../../components/ui/field-style';
import type { AppointmentStatus } from '../../../types';
import content from '../../../content/es.json';

const { admin: text, appointments: appointmentsText } = content;

const CANCELLABLE = ['pending', 'confirmed', 'paid', 'reminded'];
const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'paid', 'reminded', 'completed', 'cancelled', 'no_show'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function AdminAppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [date, setDate] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: appointments,
    loading,
    run,
  } = useApi(() => adminAppointmentsApi.list({ status, date }), { deps: [status, date] });

  async function handleCancel(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      await adminAppointmentsApi.cancel(id);
      await run();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : appointmentsText.cancelError);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{text.title}</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600">
          {text.filterStatus}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
            className={fieldClass}
          >
            <option value="">{text.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {appointmentsText.status[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600">
          {text.filterDate}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </label>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-neutral-900">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">{content.common.loading}</p>
      ) : !appointments || appointments.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">{text.empty}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {text.patientLabel}: {appointment.patient?.name} ({appointment.patient?.email})
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {text.doctorLabel}: {appointment.doctor?.name} · {appointment.service?.name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">{formatDateTime(appointment.startsAt)}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                <div className="mt-4 flex gap-2">
                  <Link to={`/staff/citas/${appointment.id}`}>
                    <Button variant="outline">{text.viewEvents}</Button>
                  </Link>
                  {CANCELLABLE.includes(appointment.status) && (
                    <Button
                      variant="outline"
                      disabled={cancellingId === appointment.id}
                      onClick={() => handleCancel(appointment.id)}
                    >
                      {cancellingId === appointment.id ? appointmentsText.cancelling : text.cancel}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
