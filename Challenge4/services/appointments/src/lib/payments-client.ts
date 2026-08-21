import { serviceUnavailable } from '@vitalis/shared';
import { env } from '../config/env.js';

/**
 * Cliente HTTP hacia Payments — la única llamada síncrona entre servicios en
 * todo el sistema (ver ADR de comunicación sync vs async). Se justifica
 * porque `createAppointment`/`cancelAppointment` necesitan una respuesta YA
 * (¿se pudo iniciar el cobro?, ¿se pudo reembolsar?) para decidir qué le
 * devuelven al usuario — no es un dato que valga la pena esperar de forma
 * asíncrona.
 */
async function callPayments<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.PAYMENTS_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': env.INTERNAL_SERVICE_TOKEN,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw serviceUnavailable('No se pudo contactar al servicio de pagos. Intenta de nuevo en unos minutos.');
  }

  if (!response.ok) {
    throw serviceUnavailable('No se pudo procesar el pago. Intenta de nuevo en unos minutos.');
  }

  return response.json() as Promise<T>;
}

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
  checkoutSessionId: string;
}

export function createCheckoutSession(input: {
  appointmentId: string;
  amountCents: number;
  serviceName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CreateCheckoutSessionResult> {
  return callPayments('/internal/checkout-sessions', input);
}

export function refundPayment(appointmentId: string): Promise<{ refundId: string }> {
  return callPayments(`/internal/payments/${appointmentId}/refund`, {});
}
