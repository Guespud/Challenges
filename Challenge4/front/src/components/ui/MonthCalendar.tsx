import { useState } from 'react';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Date(Date.UTC(2000, i, 1)).toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' }),
);
const YEAR_RANGE = 6;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ChevronIcon({ direction }: { readonly direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface MonthCalendarProps {
  readonly month: Date;
  readonly onMonthChange: (next: Date) => void;
  readonly highlightedDates: ReadonlySet<string>;
  readonly selectedDate: string | null;
  readonly onSelectDate: (date: string) => void;
  readonly todayKey: string;
}

export function MonthCalendar({
  month,
  onMonthChange,
  highlightedDates,
  selectedDate,
  onSelectDate,
  todayKey,
}: MonthCalendarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = capitalizeFirst(
    new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  );

  const years = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => year - YEAR_RANGE + i);

  return (
    <div className="w-full rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(Date.UTC(year, monthIndex - 1, 1)))}
          aria-label="Mes anterior"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronIcon direction="left" />
        </button>

        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          className="rounded-full px-3 py-1 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
        >
          {monthLabel}
        </button>

        <button
          type="button"
          onClick={() => onMonthChange(new Date(Date.UTC(year, monthIndex + 1, 1)))}
          aria-label="Mes siguiente"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-3 flex gap-2 rounded-xl bg-neutral-50 p-2">
          <select
            value={monthIndex}
            onChange={(e) => {
              onMonthChange(new Date(Date.UTC(year, Number(e.target.value), 1)));
              setPickerOpen(false);
            }}
            className="flex-1 rounded-lg border-0 bg-white px-2 py-1.5 text-sm capitalize text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i} className="capitalize">
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => {
              onMonthChange(new Date(Date.UTC(Number(e.target.value), monthIndex, 1)));
              setPickerOpen(false);
            }}
            className="rounded-lg border-0 bg-white px-2 py-1.5 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-3 text-center text-xs font-semibold uppercase text-neutral-400">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i - cells.length}`} />;

          const dateKey = toDateKey(year, monthIndex, day);
          const hasAppointments = highlightedDates.has(dateKey);
          const isSelected = selectedDate === dateKey;
          const isToday = dateKey === todayKey;

          return (
            <div key={dateKey} className="flex items-center justify-center">
              <button
                type="button"
                disabled={!hasAppointments}
                onClick={() => hasAppointments && onSelectDate(dateKey)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition sm:h-11 sm:w-11 ${
                  hasAppointments
                    ? `cursor-pointer text-white ${isSelected ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'}`
                    : 'cursor-default font-medium text-neutral-300'
                } ${isToday ? 'ring-2 ring-offset-2 ring-neutral-900' : ''}`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
