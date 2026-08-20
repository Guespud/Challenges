import { Link, useParams } from 'react-router-dom';
import { patientApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { HabitChart } from '../../../components/HabitChart';
import { HabitEntriesTable } from '../../../components/HabitEntriesTable';
import content from '../../../content/es.json';

const { patients: text, common } = content;
const { table: tableText } = content.habits;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts.at(-1)![0]}` : parts[0]?.slice(0, 2);
  return (initials ?? '?').toUpperCase();
}

export function NutritionistPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: history, error, loading } = useApi(() => patientApi.habits(id!, 30), { deps: [id] });
  const { data: patients } = useApi(() => patientApi.list());
  const patient = patients?.find((p) => p.id === id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:px-6">
      <Link to="/nutriologa" className="w-fit text-sm font-medium text-violet-700 hover:text-violet-900">
        {text.backLink}
      </Link>

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
            {patient ? getInitials(patient.name) : '…'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-neutral-900">
              {patient?.name ?? text.detailTitle}
            </h1>
            <p className="truncate text-xs text-neutral-500">{patient?.email}</p>
          </div>
        </div>

        {loading && <p className="text-sm text-neutral-500">{common.loading}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {history && <HabitChart entries={history} />}
      </section>

      {history && (
        <section className="flex flex-col rounded-3xl border border-neutral-100 bg-white p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-5">
          <h2 className="mb-3 flex-none text-base font-bold tracking-tight text-neutral-900">{tableText.title}</h2>
          <HabitEntriesTable entries={history} />
        </section>
      )}
    </div>
  );
}
