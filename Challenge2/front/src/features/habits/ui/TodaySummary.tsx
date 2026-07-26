import type { HabitEntry } from '../../../types';
import content from '../../../content/es.json';

const { today: text, chart } = content.habits;

const COLOR_WATER = '#2a78d6';
const COLOR_EXERCISE = '#4a3aa7';
const COLOR_SLEEP = '#1baf7a';

function Stat({ color, label, value }: { readonly color: string; readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="text-sm font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

export function TodaySummary({ entry }: { readonly entry: HabitEntry }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-8">
      <div className="flex flex-col gap-2">
        <span className="w-fit shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {text.badge}
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">{text.title}</h2>
          <p className="text-sm text-neutral-500">{text.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Stat color={COLOR_WATER} label={chart.water} value={`${Math.round((entry.waterMl / 1000) * 10) / 10} ${chart.units.water}`} />
        <Stat color={COLOR_EXERCISE} label={chart.exercise} value={`${entry.exerciseMin} ${chart.units.exercise}`} />
        <Stat color={COLOR_SLEEP} label={chart.sleep} value={`${entry.sleepHours} ${chart.units.sleep}`} />
      </div>
    </div>
  );
}
