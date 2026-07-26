import { habitApi } from '../data/endpoints';
import { today } from '../data/today';
import { useApi } from '../../../core/useApi';
import { useAuth, LogoutButton } from '../../auth';
import { HabitChart } from '../../../components/HabitChart';
import { HabitForm } from './HabitForm';
import { TodaySummary } from './TodaySummary';
import content from '../../../content/es.json';

const { dashboard: text } = content.habits;
const { common } = content;

export function PatientDashboardPage() {
  const { user } = useAuth();
  const { data: history, error, loading, run } = useApi(() => habitApi.history(30));
  const todayEntry = history?.find((entry) => entry.date.slice(0, 10) === today());

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {text.greeting}, {user?.name}
            </h1>
            <p className="text-sm text-neutral-500">{text.subtitle}</p>
          </div>
          <LogoutButton />
        </header>

        {(() => {
          if (loading) {
            return (
              <div className="h-40 animate-pulse rounded-3xl border border-neutral-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]" />
            );
          }
          return todayEntry ? <TodaySummary entry={todayEntry} /> : <HabitForm onSaved={() => run()} />;
        })()}

        <section className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-8">
          <h2 className="mb-4 text-lg font-bold tracking-tight text-neutral-900">{text.historyTitle}</h2>
          {loading && <p className="text-sm text-neutral-500">{common.loading}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {history && <HabitChart entries={history} />}
        </section>
      </div>
    </div>
  );
}
