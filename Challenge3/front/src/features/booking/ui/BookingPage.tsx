import { useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorsApi } from '../../doctors';
import { appointmentsApi } from '../../appointments';
import { useApi } from '../../../core/useApi';
import { ApiError } from '../../../core/api';
import { useToast } from '../../../core/toast/ToastProvider';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { fieldClass, fieldErrorClass } from '../../../components/ui/field-style';
import { bookingSchema, type BookingInput } from '../data/booking.schema';
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-spin text-neutral-300">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

function SlotsEmptyState({ icon, message }: { readonly icon: ReactNode; readonly message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 text-center">
      <span className="text-neutral-300">{icon}</span>
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  );
}

export function BookingPage() {
  const { data: catalog, loading: loadingCatalog } = useApi(() => doctorsApi.list());
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: { doctorId: '', serviceId: '', date: '', slot: '' },
  });

  const doctorId = watch('doctorId');
  const serviceId = watch('serviceId');
  const date = watch('date');
  const selectedSlotStartsAt = watch('slot');

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
    setValue('slot', slot.startsAt, { shouldValidate: true });
  }

  async function onSubmit(data: BookingInput) {
    try {
      const { checkoutUrl } = await appointmentsApi.create({
        doctorId: data.doctorId,
        serviceId: data.serviceId,
        startsAt: data.slot,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast(text.slotTaken, 'error');
        setValue('slot', '');
        await refetchSlots().catch(() => {});
      } else {
        showToast(err instanceof ApiError ? err.message : text.genericError, 'error');
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{text.title}</h1>
      <p className="mt-1.5 text-[15px] text-neutral-500">{text.subtitle}</p>

      <Card className="mt-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600">
              {text.doctorLabel}
              <select
                disabled={loadingCatalog}
                className={errors.doctorId ? fieldErrorClass : fieldClass}
                {...register('doctorId', { onChange: () => setValue('slot', '') })}
              >
                <option value="">{text.selectPlaceholder}</option>
                {catalog?.doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
              <span className="block min-h-4 text-xs font-semibold text-red-600">{errors.doctorId?.message}</span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600">
              {text.serviceLabel}
              <select
                disabled={loadingCatalog}
                className={errors.serviceId ? fieldErrorClass : fieldClass}
                {...register('serviceId')}
              >
                <option value="">{text.selectPlaceholder}</option>
                {catalog?.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <span className="block min-h-4 text-xs font-semibold text-red-600">{errors.serviceId?.message}</span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-600 sm:col-span-2">
              {text.dateLabel}
              <input
                type="date"
                min={todayIso()}
                className={errors.date ? fieldErrorClass : fieldClass}
                {...register('date', { onChange: () => setValue('slot', '') })}
              />
              <span className="block min-h-4 text-xs font-semibold text-red-600">{errors.date?.message}</span>
            </label>
          </div>

          {selectedService && (
            <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
              <span className="rounded-full bg-neutral-100 px-3 py-1">{selectedService.durationMin} min</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                {formatPrice(selectedService.priceCents)}
              </span>
            </div>
          )}

          <div className="mt-3">
            <h2 className="text-sm font-semibold text-neutral-900">{text.slotsTitle}</h2>

            <div className="mt-2 h-48">
              {(() => {
                if (!doctorId || !date) {
                  return <SlotsEmptyState icon={<CalendarIcon />} message={text.pickDatePrompt} />;
                }
                if (loadingSlots) {
                  return <SlotsEmptyState icon={<Spinner />} message={text.loadingSlots} />;
                }
                if (availability?.slots.length === 0) {
                  return <SlotsEmptyState icon={<ClockIcon />} message={text.noSlots} />;
                }
                return (
                  <div className="h-full overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {availability?.slots.map((slot) => {
                        const isSelected = selectedSlotStartsAt === slot.startsAt;
                        return (
                          <button
                            key={slot.startsAt}
                            type="button"
                            onClick={() => selectSlot(slot)}
                            className={`rounded-xl py-2.5 text-sm font-medium transition-all duration-150 ${
                              isSelected
                                ? 'bg-blue-700 text-white shadow-sm shadow-blue-700/30'
                                : 'bg-white text-neutral-900 shadow-sm hover:bg-neutral-100 active:scale-95'
                            }`}
                          >
                            {formatSlotTime(slot.startsAt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            <span className="block min-h-4 text-xs font-semibold text-red-600">{errors.slot?.message}</span>
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? text.confirming : text.confirm}
          </Button>
        </form>
      </Card>
    </div>
  );
}
