import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { appointmentsApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { ApiError } from '../../../core/api';
import { nowLikeStored } from '../../../core/time';
import { useToast } from '../../../core/toast/ToastProvider';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../../components/StatusBadge';
import type { Appointment } from '../../../types';
import content from '../../../content/es.json';

const { appointments: text } = content;

const CANCELLABLE = ['pending', 'confirmed', 'paid', 'reminded'];
const PAST_STATUSES = ['cancelled', 'completed', 'no_show'];
const PAGE_SIZE = 5;

function formatDayNumber(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', timeZone: 'UTC' });
}

function formatMonthAbbr(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }).replace('.', '');
}

function formatWeekdayTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppointmentRow({
  appointment,
  cancellingId,
  onCancel,
}: {
  readonly appointment: Appointment;
  readonly cancellingId: string | null;
  readonly onCancel: (id: string) => void;
}) {
  const hasElapsed = new Date(appointment.startsAt).getTime() < nowLikeStored();
  const isPast = PAST_STATUSES.includes(appointment.status) || hasElapsed;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <span className="text-sm font-bold leading-none">{formatDayNumber(appointment.startsAt)}</span>
        <span className="text-[9px] font-semibold uppercase leading-none">{formatMonthAbbr(appointment.startsAt)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {appointment.service?.name} {text.with} {appointment.doctor?.name}
          </p>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          <span className="capitalize">{formatWeekdayTime(appointment.startsAt)}</span>
          {appointment.service && <span> · {formatPrice(appointment.service.priceCents)}</span>}
        </p>
        {appointment.status === 'pending' && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 flex-none animate-pulse rounded-full bg-blue-500" />
            {text.pendingHint}
          </p>
        )}
      </div>

      {CANCELLABLE.includes(appointment.status) && !hasElapsed && (
        <button
          type="button"
          disabled={cancellingId === appointment.id}
          onClick={() => onCancel(appointment.id)}
          aria-label={text.cancel}
          title={text.cancel}
          className="flex h-6 w-6 flex-none self-start items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancellingId === appointment.id ? (
            <Spinner />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function AppointmentSection({
  title,
  items,
  cancellingId,
  onCancel,
}: {
  readonly title: string;
  readonly items: Appointment[];
  readonly cancellingId: string | null;
  readonly onCancel: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {title} ({items.length})
      </h2>
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
        <div className="divide-y divide-neutral-100">
          {paginated.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              cancellingId={cancellingId}
              onCancel={onCancel}
            />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {text.prevPage}
          </button>
          <span className="tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {text.nextPage}
          </button>
        </div>
      )}
    </section>
  );
}

export function AppointmentsPage() {
  const { data: appointments, loading, run } = useApi(() => appointmentsApi.mine());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const { upcoming, history } = useMemo(() => {
    const now = nowLikeStored();
    const sorted = [...(appointments ?? [])].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const isUpcoming = (a: Appointment) => !PAST_STATUSES.includes(a.status) && new Date(a.startsAt).getTime() >= now;
    return {
      upcoming: sorted.filter(isUpcoming),
      history: sorted.filter((a) => !isUpcoming(a)).reverse(),
    };
  }, [appointments]);

  async function performCancel() {
    if (!confirmingId) return;
    const id = confirmingId;
    setCancellingId(id);
    try {
      await appointmentsApi.cancel(id);
      await run();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : text.cancelError, 'error');
    } finally {
      setCancellingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{text.title}</h1>

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50" />
      ) : !appointments || appointments.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 py-14 text-center">
          <span className="text-neutral-300">
            <CalendarIcon />
          </span>
          <p className="text-sm text-neutral-500">{text.empty}</p>
          <Link to="/paciente">
            <Button className="mt-1">{text.emptyCta}</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {upcoming.length > 0 && (
            <AppointmentSection
              title={text.upcomingSection}
              items={upcoming}
              cancellingId={cancellingId}
              onCancel={setConfirmingId}
            />
          )}
          {history.length > 0 && (
            <AppointmentSection
              title={text.historySection}
              items={history}
              cancellingId={cancellingId}
              onCancel={setConfirmingId}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmingId !== null}
        title={text.confirmCancelTitle}
        description={text.confirmCancelDescription}
        confirmLabel={cancellingId ? text.cancelling : text.confirmCancelYes}
        cancelLabel={text.confirmCancelNo}
        loading={cancellingId !== null}
        onConfirm={performCancel}
        onClose={() => setConfirmingId(null)}
      />
    </div>
  );
}
