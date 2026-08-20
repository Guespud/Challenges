import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAppointmentsApi } from '../data/endpoints';
import { useApi } from '../../../core/useApi';
import { ApiError } from '../../../core/api';
import { nowLikeStored } from '../../../core/time';
import { useToast } from '../../../core/toast/ToastProvider';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../../components/StatusBadge';
import { fieldClass } from '../../../components/ui/field-style';
import type { Appointment, AppointmentStatus } from '../../../types';
import content from '../../../content/es.json';

const { admin: text, appointments: appointmentsText } = content;

const CANCELLABLE = ['pending', 'confirmed', 'paid', 'reminded'];
const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'paid', 'reminded', 'completed', 'cancelled', 'no_show'];
const PAGE_SIZE = 8;

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

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function AdminAppointmentRow({
  appointment,
  cancellingId,
  onCancel,
}: {
  readonly appointment: Appointment;
  readonly cancellingId: string | null;
  readonly onCancel: (id: string) => void;
}) {
  const hasElapsed = new Date(appointment.startsAt).getTime() < nowLikeStored();

  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <span className="text-sm font-bold leading-none">{formatDayNumber(appointment.startsAt)}</span>
        <span className="text-[9px] font-semibold uppercase leading-none">{formatMonthAbbr(appointment.startsAt)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {text.patientLabel}: {appointment.patient?.name}
          </p>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {text.doctorLabel}: {appointment.doctor?.name} · {appointment.service?.name}
        </p>
        <p className="mt-0.5 text-xs capitalize text-neutral-400">{formatWeekdayTime(appointment.startsAt)}</p>
      </div>

      <div className="flex flex-none items-center gap-1.5 self-start">
        <Link
          to={`/staff/citas/${appointment.id}`}
          aria-label={text.viewEvents}
          title={text.viewEvents}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          <EventsIcon />
        </Link>
        {CANCELLABLE.includes(appointment.status) && !hasElapsed && (
          <button
            type="button"
            disabled={cancellingId === appointment.id}
            onClick={() => onCancel(appointment.id)}
            aria-label={text.cancel}
            title={text.cancel}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancellingId === appointment.id ? <Spinner /> : <CancelIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminAppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const {
    data: appointments,
    loading,
    run,
  } = useApi(() => adminAppointmentsApi.list({ status, date }), { deps: [status, date] });

  const totalPages = Math.max(1, Math.ceil((appointments?.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => (appointments ?? []).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [appointments, currentPage],
  );

  function handleFilterChange(update: () => void) {
    update();
    setPage(1);
  }

  async function performCancel() {
    if (!confirmingId) return;
    const id = confirmingId;
    setCancellingId(id);
    try {
      await adminAppointmentsApi.cancel(id);
      await run();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : appointmentsText.cancelError, 'error');
    } finally {
      setCancellingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{text.title}</h1>

      <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] sm:p-5">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-neutral-600 sm:flex-none sm:min-w-48">
          {text.filterStatus}
          <select
            value={status}
            onChange={(e) => handleFilterChange(() => setStatus(e.target.value as AppointmentStatus | ''))}
            className={fieldClass}
          >
            <option value="">{text.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {appointmentsText.status[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-neutral-600 sm:flex-none sm:min-w-48">
          {text.filterDate}
          <input
            type="date"
            value={date}
            onChange={(e) => handleFilterChange(() => setDate(e.target.value))}
            className={fieldClass}
          />
        </label>

        {(status || date) && (
          <button
            type="button"
            onClick={() =>
              handleFilterChange(() => {
                setStatus('');
                setDate('');
              })
            }
            className="rounded-full px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            {appointmentsText.clearFilters}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50" />
      ) : !appointments || appointments.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">{text.empty}</p>
      ) : (
        <>
          <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
            <div className="divide-y divide-neutral-100">
              {paginated.map((appointment) => (
                <AdminAppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  cancellingId={cancellingId}
                  onCancel={setConfirmingId}
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
                {appointmentsText.prevPage}
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
                {appointmentsText.nextPage}
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmingId !== null}
        title={appointmentsText.confirmCancelTitle}
        description={appointmentsText.confirmCancelDescription}
        confirmLabel={cancellingId ? appointmentsText.cancelling : appointmentsText.confirmCancelYes}
        cancelLabel={appointmentsText.confirmCancelNo}
        loading={cancellingId !== null}
        onConfirm={performCancel}
        onClose={() => setConfirmingId(null)}
      />
    </div>
  );
}
