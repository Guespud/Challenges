import type { HabitEntry } from '../types';
import content from '../content/es.json';

const { table: text, chart } = content.habits;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export function HabitEntriesTable({ entries }: { readonly entries: HabitEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">{chart.empty}</p>;
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-100">
      <table className="w-full min-w-105 text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3">{text.date}</th>
            <th className="px-4 py-3">{chart.water}</th>
            <th className="px-4 py-3">{chart.exercise}</th>
            <th className="px-4 py-3">{chart.sleep}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.id} className="border-b border-neutral-50 last:border-0">
              <td className="px-4 py-3 font-medium text-neutral-900">{formatDate(entry.date)}</td>
              <td className="px-4 py-3 text-neutral-700">
                {Math.round((entry.waterMl / 1000) * 10) / 10} {chart.units.water}
              </td>
              <td className="px-4 py-3 text-neutral-700">
                {entry.exerciseMin} {chart.units.exercise}
              </td>
              <td className="px-4 py-3 text-neutral-700">
                {Math.round(entry.sleepHours * 10) / 10} {chart.units.sleep}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
