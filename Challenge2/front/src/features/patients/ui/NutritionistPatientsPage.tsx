import { Link } from 'react-router-dom';
import { patientApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { LogoutButton } from '../../auth';
import content from '../../../content/es.json';

const { patients: text, common } = content;

export function NutritionistPatientsPage() {
  const { data: patients, error, loading } = useApi(() => patientApi.list());

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{text.listTitle}</h1>
          <LogoutButton />
        </header>

        {loading && <p className="text-sm text-neutral-500">{common.loading}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
          {patients?.map((patient) => (
            <li key={patient.id}>
              <Link
                to={`/nutriologa/pacientes/${patient.id}`}
                className="flex items-center justify-between px-6 py-4 transition hover:bg-violet-50/50"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-neutral-900">{patient.name}</span>
                  <span className="text-xs text-neutral-500">{patient.email}</span>
                </span>
                <span className="text-violet-600">→</span>
              </Link>
            </li>
          ))}
          {patients?.length === 0 && <li className="px-6 py-4 text-sm text-neutral-500">{text.empty}</li>}
        </ul>
      </div>
    </div>
  );
}
