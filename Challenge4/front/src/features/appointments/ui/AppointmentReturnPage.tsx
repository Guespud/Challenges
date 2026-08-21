import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { appointmentsApi } from '../data/endpoints';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { Appointment } from '../../../types';
import content from '../../../content/es.json';

const { return: text } = content;

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15;

// El query param ?pago=exitoso viene del redirect del navegador tras el
// checkout de Stripe — nunca es fuente de verdad de que el pago se aplicó
// (ver ADR-007). Esta página consulta /appointments/me y espera a que el
// webhook mueva el estado real antes de mostrar éxito.
export function AppointmentReturnPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const paymentCancelled = searchParams.get('pago') === 'cancelado';

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [pollsDone, setPollsDone] = useState(0);
  const [failed, setFailed] = useState(false);
  const pollsRef = useRef(0);

  useEffect(() => {
    if (paymentCancelled || !id) return;

    let cancelled = false;

    async function poll() {
      try {
        const appointments = await appointmentsApi.mine();
        const found = appointments.find((a) => a.id === id) ?? null;
        if (cancelled) return;

        setAppointment(found);
        pollsRef.current += 1;
        setPollsDone(pollsRef.current);

        if (found && found.status === 'pending' && pollsRef.current < MAX_POLLS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [id, paymentCancelled]);

  if (paymentCancelled) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card className="text-center">
          <h1 className="text-xl font-bold text-neutral-900">{text.cancelledTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500">{text.cancelledBody}</p>
          <Link to="/paciente/citas">
            <Button className="mt-6">{text.backLink}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const stillPending = !failed && appointment?.status === 'pending' && pollsDone >= MAX_POLLS;
  const confirmed = appointment && appointment.status !== 'pending';

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card className="text-center">
        {confirmed ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">{text.successTitle}</h1>
            <p className="mt-2 text-sm text-neutral-500">{text.successBody}</p>
          </>
        ) : stillPending ? (
          <>
            <h1 className="text-xl font-bold text-neutral-900">{text.stillPendingTitle}</h1>
            <p className="mt-2 text-sm text-neutral-500">{text.stillPendingBody}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-blue-600" />
            <h1 className="text-xl font-bold text-neutral-900">{text.confirmingTitle}</h1>
            <p className="mt-2 text-sm text-neutral-500">{text.confirmingBody}</p>
          </>
        )}
        <Link to="/paciente/citas">
          <Button className="mt-6">{text.backLink}</Button>
        </Link>
      </Card>
    </div>
  );
}
