import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import content from '../../../content/es.json';

const { patients: text, common } = content;

const PAGE_SIZE = 5;

export function NutritionistPatientsPage() {
  const { data: patients, error, loading } = useApi(() => patientApi.list());
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return patients ?? [];
    return (patients ?? []).filter(
      (patient) =>
        patient.name.toLowerCase().includes(normalized) || patient.email.toLowerCase().includes(normalized),
    );
  }, [patients, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{text.listTitle}</h1>
      </header>

      <label htmlFor="patients-search" className="sr-only">
        Buscar paciente
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
        <input
          id="patients-search"
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Buscar por nombre o email…"
          className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-[15px] text-neutral-900 placeholder:text-neutral-400 shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
        />
      </div>

      {loading && <p className="text-sm text-neutral-500">{common.loading}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60">
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Paciente</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Email</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paginated.map((patient) => (
              <tr key={patient.id} className="transition hover:bg-violet-50/50">
                <td className="px-6 py-4">
                  <Link to={`/nutriologa/pacientes/${patient.id}`} className="text-sm font-semibold text-neutral-900">
                    {patient.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-500">{patient.email}</td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/nutriologa/pacientes/${patient.id}`} className="text-violet-600">
                    →
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-sm text-neutral-500">
                  {patients?.length === 0 ? text.empty : 'No se encontraron pacientes.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de{' '}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-1 text-neutral-600">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
