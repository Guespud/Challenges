import { useMemo, useState } from 'react';
import type { HabitEntry } from '../types';
import content from '../content/es.json';

const { table: text, chart } = content.habits;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export function HabitEntriesTable({ entries }: { readonly entries: HabitEntry[] }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const entriesByDate = useMemo(() => {
    const index = new Map<string, HabitEntry>();
    for (const entry of entries) index.set(entry.date.slice(0, 10), entry);
    return index;
  }, [entries]);

  const sortedDates = useMemo(() => Array.from(entriesByDate.keys()).sort((a, b) => b.localeCompare(a)), [entriesByDate]);

  const filteredDates = useMemo(
    () => sortedDates.filter((date) => (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)),
    [sortedDates, dateFrom, dateTo],
  );

  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">{chart.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-none flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-neutral-600">
            {text.from}
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:w-auto"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-neutral-600">
            {text.to}
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 sm:w-auto"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          {dateFrom || dateTo ? (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="-ml-3 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50 hover:text-violet-800"
            >
              {text.clear}
            </button>
          ) : (
            <span />
          )}
          <span className="text-xs text-neutral-400">
            {filteredDates.length} / {sortedDates.length}
          </span>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-2xl border border-neutral-100">
        <table className="w-full min-w-105 text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">{text.date}</th>
              <th className="px-4 py-3">{chart.water}</th>
              <th className="px-4 py-3">{chart.exercise}</th>
              <th className="px-4 py-3">{chart.sleep}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filteredDates.map((date, index) => {
              const entry = entriesByDate.get(date)!;
              return (
                <tr key={entry.id} className={`transition hover:bg-violet-50/60 ${index % 2 === 1 ? 'bg-neutral-50/50' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-neutral-900">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {Math.round((entry.waterMl / 1000) * 10) / 10} {chart.units.water}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                      {entry.exerciseMin} {chart.units.exercise}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {Math.round(entry.sleepHours * 10) / 10} {chart.units.sleep}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredDates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-neutral-500">
                  {text.noResults}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
