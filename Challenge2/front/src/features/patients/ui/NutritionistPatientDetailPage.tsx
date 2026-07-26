import { Link, useParams } from 'react-router-dom';
import { patientApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { HabitChart } from '../../../components/HabitChart';
import { HabitEntriesTable } from '../../../components/HabitEntriesTable';
import content from '../../../content/es.json';

const { patients: text, common } = content;
const { table: tableText } = content.habits;

export function NutritionistPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: history, error, loading } = useApi(() => patientApi.habits(id!, 30), { deps: [id] });

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Link to="/nutriologa" className="w-fit text-sm font-medium text-violet-700 hover:text-violet-900">
          {text.backLink}
        </Link>

        <section className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-8">
          <h1 className="mb-4 text-lg font-bold tracking-tight text-neutral-900">{text.detailTitle}</h1>

          {loading && <p className="text-sm text-neutral-500">{common.loading}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {history && <HabitChart entries={history} />}
        </section>

        {history && (
          <section className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-8">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-neutral-900">{tableText.title}</h2>
            <HabitEntriesTable entries={history} />
          </section>
        )}
      </div>
    </div>
  );
}
