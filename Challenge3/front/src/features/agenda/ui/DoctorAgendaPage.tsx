import { agendaApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import content from '../../../content/es.json';

const { agenda: text } = content;

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

export function DoctorAgendaPage() {
  const { data: appointments, loading } = useApi(() => agendaApi.mine());

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{text.title}</h1>
      <p className="mt-1.5 text-[15px] text-neutral-500">{text.subtitle}</p>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-500">{content.common.loading}</p>
      ) : !appointments || appointments.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">{text.empty}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {text.patientLabel}: {appointment.patient?.name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">{appointment.service?.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">{formatDateTime(appointment.startsAt)}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
