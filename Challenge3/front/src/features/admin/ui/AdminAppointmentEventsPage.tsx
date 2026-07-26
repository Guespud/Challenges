import { Link, useParams } from 'react-router-dom';
import { adminAppointmentsApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { Card } from '../../../components/ui/Card';
import content from '../../../content/es.json';

const { admin: text } = content;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'medium' });
}

export function AdminAppointmentEventsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: events, loading } = useApi(() => adminAppointmentsApi.events(id!), { deps: [id] });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/staff" className="text-sm font-medium text-blue-700 hover:text-blue-900">
        {text.backLink}
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-neutral-900">{text.eventsTitle}</h1>

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">{content.common.loading}</p>
      ) : !events || events.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">{text.eventsEmpty}</p>
      ) : (
        <ol className="mt-6 flex flex-col gap-3 border-l-2 border-neutral-200 pl-4">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-semibold text-neutral-900">{event.type}</span>
                  <span className="text-xs text-neutral-500">{formatDateTime(event.createdAt)}</span>
                </div>
                {event.payload != null && (
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
