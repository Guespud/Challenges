import { useState } from 'react';
import { appointmentsApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { ApiError } from '../../../core/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import content from '../../../content/es.json';

const { appointments: text } = content;

const CANCELLABLE = ['pending', 'confirmed', 'paid', 'reminded'];

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

export function AppointmentsPage() {
  const { data: appointments, loading, run } = useApi(() => appointmentsApi.mine());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      await appointmentsApi.cancel(id);
      await run();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : text.cancelError);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{text.title}</h1>

      {error && <p className="mt-4 text-sm font-semibold text-neutral-900">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">{content.common.loading}</p>
      ) : !appointments || appointments.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">{text.empty}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {appointment.service?.name} {text.with} {appointment.doctor?.name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">{formatDateTime(appointment.startsAt)}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                {CANCELLABLE.includes(appointment.status) && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    disabled={cancellingId === appointment.id}
                    onClick={() => handleCancel(appointment.id)}
                  >
                    {cancellingId === appointment.id ? text.cancelling : text.cancel}
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
