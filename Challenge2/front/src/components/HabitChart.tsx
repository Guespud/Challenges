import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HabitEntry } from '../types';
import content from '../content/es.json';

const { chart: text } = content.habits;

const COLOR_WATER = '#2a78d6';
const COLOR_EXERCISE = '#4a3aa7';
const COLOR_SLEEP = '#1baf7a';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

interface Metric {
  key: 'water' | 'exercise' | 'sleep';
  label: string;
  color: string;
  value: (entry: HabitEntry) => number;
  format: (value: number) => string;
}

const METRICS: Metric[] = [
  {
    key: 'water',
    label: text.water,
    color: COLOR_WATER,
    value: (entry) => Math.round((entry.waterMl / 1000) * 10) / 10,
    format: (value) => `${value} ${text.units.water}`,
  },
  {
    key: 'exercise',
    label: text.exercise,
    color: COLOR_EXERCISE,
    value: (entry) => entry.exerciseMin,
    format: (value) => `${value} ${text.units.exercise}`,
  },
  {
    key: 'sleep',
    label: text.sleep,
    color: COLOR_SLEEP,
    value: (entry) => Math.round(entry.sleepHours * 10) / 10,
    format: (value) => `${value} ${text.units.sleep}`,
  },
];

function MetricRow({ metric, entries }: { readonly metric: Metric; readonly entries: HabitEntry[] }) {
  const data = entries.map((entry) => ({ date: formatDate(entry.date), value: metric.value(entry) }));
  const latest = data.at(-1)?.value ?? 0;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
          {metric.label}
        </span>
        <span className="flex flex-col items-end leading-tight">
          <span className="text-lg font-bold text-neutral-900">{metric.format(latest)}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">{text.latest}</span>
        </span>
      </div>

      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: '#a3a3a3' }}
              dy={4}
            />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e5e5', fontSize: 12 }}
              labelFormatter={(label) => label}
              formatter={(value) => [metric.format(Number(value)), metric.label]}
            />
            <Line type="monotone" dataKey="value" name={metric.label} stroke={metric.color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatRangeDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

export function HabitChart({ entries }: { readonly entries: HabitEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500">{text.empty}</p>;
  }

  const first = entries[0];
  const last = entries.at(-1)!;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
          {text.windowLabel}
        </span>
        <p className="text-xs text-neutral-500">
          {text.rangeLabel} {formatRangeDate(first.date)} – {formatRangeDate(last.date)} · {entries.length} {text.days}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {METRICS.map((metric) => (
          <MetricRow key={metric.key} metric={metric} entries={entries} />
        ))}
      </div>
    </div>
  );
}
