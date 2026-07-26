import { useMemo, useState } from 'react';
import { doctorsApi } from '../../doctors';
import { appointmentsApi } from '../../appointments';
import { useApi } from '../../../core/useApi';
import { ApiError } from '../../../core/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { fieldClass } from '../../../components/ui/field-style';
import type { Slot } from '../../../types';
import content from '../../../content/es.json';

const { booking: text } = content;

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BookingPage() {
  const { data: catalog, loading: loadingCatalog } = useApi(() => doctorsApi.list());

  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: availability,
    loading: loadingSlots,
    run: refetchSlots,
  } = useApi(() => doctorsApi.availability(doctorId, date), {
    immediate: Boolean(doctorId && date),
    deps: [doctorId, date],
  });

  const selectedService = useMemo(
    () => catalog?.services.find((service) => service.id === serviceId) ?? null,
    [catalog, serviceId],
  );

  function selectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setSubmitError(null);
  }

  async function handleConfirm() {
    if (!doctorId || !serviceId || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { checkoutUrl } = await appointmentsApi.create({
        doctorId,
        serviceId,
        startsAt: selectedSlot.startsAt,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError(text.slotTaken);
        setSelectedSlot(null);
        await refetchSlots().catch(() => {});
      } else {
        setSubmitError(err instanceof ApiError ? err.message : text.genericError);
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{text.title}</h1>
      <p className="mt-1.5 text-[15px] text-neutral-500">{text.subtitle}</p>

      <Card className="mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600">
            {text.doctorLabel}
            <select
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setSelectedSlot(null);
              }}
              disabled={loadingCatalog}
              className={fieldClass}
            >
              <option value="">{text.selectPlaceholder}</option>
              {catalog?.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600">
            {text.serviceLabel}
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              disabled={loadingCatalog}
              className={fieldClass}
            >
              <option value="">{text.selectPlaceholder}</option>
              {catalog?.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600 sm:col-span-2">
            {text.dateLabel}
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot(null);
              }}
              className={fieldClass}
            />
          </label>
        </div>

        {selectedService && (
          <div className="mt-5 flex items-center gap-2 text-sm text-neutral-500">
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              {selectedService.durationMin} min
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              {formatPrice(selectedService.priceCents)}
            </span>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-neutral-900">{text.slotsTitle}</h2>

          {!doctorId || !date ? (
            <p className="mt-3 text-sm text-neutral-400">{text.pickDatePrompt}</p>
          ) : loadingSlots ? (
            <p className="mt-3 text-sm text-neutral-400">{text.loadingSlots}</p>
          ) : availability && availability.slots.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">{text.noSlots}</p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availability?.slots.map((slot) => {
                const isSelected = selectedSlot?.startsAt === slot.startsAt;
                return (
                  <button
                    key={slot.startsAt}
                    type="button"
                    onClick={() => selectSlot(slot)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/30'
                        : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:scale-95'
                    }`}
                  >
                    {formatSlotTime(slot.startsAt)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {submitError && <p className="mt-5 text-sm font-semibold text-neutral-900">{submitError}</p>}

        <Button
          type="button"
          disabled={!selectedSlot || !serviceId || submitting}
          onClick={handleConfirm}
          className="mt-8 w-full"
        >
          {submitting ? text.confirming : text.confirm}
        </Button>
      </Card>
    </div>
  );
}
