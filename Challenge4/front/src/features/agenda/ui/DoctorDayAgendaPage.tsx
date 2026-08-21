import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { agendaApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { nowLikeStored } from '../../../core/time';
import { StatusBadge } from '../../../components/StatusBadge';
import type { Appointment } from '../../../types';
import content from '../../../content/es.json';

const { agenda: text } = content;

const MAX_UPCOMING = 5;
const TICK_MS = 30_000;

function formatSelectedDay(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

function formatTimeParts(iso: string): { time: string; period: string } {
  const formatted = new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const [time, period = ''] = formatted.split(' ');
  return { time, period: period.replaceAll('.', '').toUpperCase() };
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgendaRow({ appointment }: { readonly appointment: Appointment }) {
  const { time, period } = formatTimeParts(appointment.startsAt);

  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="flex h-11 w-20 flex-none items-center justify-center gap-1 rounded-xl bg-blue-50 text-blue-700">
        <span className="text-sm font-bold leading-none whitespace-nowrap">{time}</span>
        <span className="text-[10px] font-semibold uppercase leading-none">{period}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {text.patientLabel}: {appointment.patient?.name}
          </p>
          <StatusBadge status={appointment.status} />
        </div>
        {appointment.service && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {appointment.service.name} · {appointment.service.durationMin} min
          </p>
        )}
      </div>
    </div>
  );
}

export function DoctorDayAgendaPage() {
  const { date } = useParams<{ date: string }>();
  const { data: appointments, loading } = useApi(() => agendaApi.mine());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const upcoming = useMemo(() => {
    if (!date) return [];
    const now = nowLikeStored();
    return (appointments ?? [])
      .filter((a) => a.startsAt.slice(0, 10) === date && new Date(a.startsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, MAX_UPCOMING);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- "tick" fuerza recalcular contra la hora actual
  }, [appointments, date, tick]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link to="/medico" className="w-fit text-sm font-medium text-blue-700 hover:text-blue-900">
        {text.backLink}
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        {text.selectedDayLabel} {date && formatSelectedDay(date)}
      </h1>
      <p className="mt-1.5 text-[15px] text-neutral-500">{text.subtitle}</p>

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50" />
      ) : upcoming.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 py-14 text-center">
          <span className="text-neutral-300">
            <CalendarIcon />
          </span>
          <p className="text-sm text-neutral-500">{text.dayEmpty}</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          <div className="divide-y divide-neutral-100">
            {upcoming.map((appointment) => (
              <AgendaRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
