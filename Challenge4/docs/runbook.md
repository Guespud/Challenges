# Runbook — Vitalis Clinic

Qué hacer cuando algo falla. Ver también la matriz de error paths en
[`SPEC.md`](../SPEC.md) y las ADRs [007](adr/ADR-007-webhook-idempotency.md) /
[008](adr/ADR-008-retry-strategy.md) para el razonamiento detrás de cada
decisión.

## "Un paciente pagó pero su cita sigue en `pending`"

**Causa probable**: el webhook de Stripe no llegó (Stripe caído, red, o el
servidor estaba abajo cuando Stripe lo envió).

**Qué hace el sistema solo**: el job de `reconciliation` corre cada 5 minutos,
detecta citas `pending` con más de 5 minutos de antigüedad que ya tienen un
`stripePaymentIntentId`, consulta el estado real en Stripe y corrige. No hace
falta intervención manual salvo que hayan pasado más de ~10 minutos.

**Verificación manual**:
1. `GET /admin/appointments/:id/events` — ver si hay un evento
   `payment_confirmed` / `payment_recorded`. Si no hay ninguno, el pago nunca
   se aplicó.
2. Revisar en el dashboard de Stripe (test mode) si el PaymentIntent asociado
   (`Appointment.stripePaymentIntentId`) está en `succeeded`.
3. Si está en `succeeded` y la cita sigue `pending` después de >10 min, revisar
   logs del worker de `reconciliation` (busca el `request_id` o el
   `appointmentId`) — probablemente Redis estuvo caído durante esa ventana.

## "Un reembolso falló al cancelar una cita"

**Causa probable**: Stripe rechazó el refund (tarjeta ya no existe, fondos
insuficientes en la cuenta de la clínica, etc.) o hubo un timeout de red.

**Qué hace el sistema solo**: nada — por diseño (ADR-007/008), la cita **no**
cambia de estado si el refund falla. Queda un `AppointmentEvent` tipo
`refund_failed` con el mensaje de error en el `payload`.

**Acción manual**:
1. `GET /admin/appointments/:id/events` — leer el `payload` del evento
   `refund_failed` para saber la causa exacta.
2. Reintentar `POST /admin/appointments/:id/cancel` desde el panel admin una
   vez resuelta la causa (ej. esperar y reintentar si fue un timeout).
3. Si el refund es imposible (ej. el pago se hizo con un método ya inválido),
   es un caso fuera del flujo automatizado — reembolso manual desde el
   dashboard de Stripe y anotar la resolución como evento manual (no hay
   endpoint para esto todavía, ver "Fuera de alcance" en SPEC.md).

## "Los recordatorios/confirmaciones no están llegando"

**Causa probable**: Resend está rechazando el envío (API key inválida, límite
de la cuenta test) o el email del paciente rebota.

**Qué hace el sistema solo**: 3 reintentos con backoff exponencial (1min,
2min). Al agotar los intentos, se registra `reminder_failed` o
`notification_failed` en `AppointmentEvent` — la cita **no** se bloquea, sigue
su ciclo de vida normal.

**Verificación**:
1. `GET /admin/appointments/:id/events` — buscar `reminder_failed` /
   `notification_failed`.
2. Revisar `RESEND_API_KEY` en `.env` y el dashboard de Resend.
3. Si el email del paciente está mal escrito, no hay reintento automático que
   lo resuelva — es responsabilidad de soporte corregir el dato.

## "Redis está caído"

**Síntoma**: `npm run worker` no arranca, o las citas se crean pero nunca se
expira el hold ni se mandan recordatorios.

**Qué NO pasa**: el servidor HTTP (`npm run dev`) sigue respondiendo — crear
una cita y procesar un webhook no dependen de que el `add()` a la cola tenga
éxito para responder al cliente (ver SPEC.md, matriz de errores). El fallo de
encolado queda en los logs pero no tumba la request.

**Acción**: `docker compose up -d redis` (o revisar por qué el contenedor se
cayó), reiniciar `npm run worker`. Los jobs que no se pudieron encolar durante
la caída no se recuperan solos — para holds huérfanos, correr manualmente una
consulta de citas `pending` viejas sin `holdExpiresAt` vencido procesado.

## "El webhook de Stripe llega pero responde 400"

**Causa probable**: `STRIPE_WEBHOOK_SECRET` no coincide con el que genera
`stripe listen` (cambia cada vez que se reinicia el comando en local) o con el
configurado en el dashboard de Stripe (producción).

**Acción**: regenerar `stripe listen --forward-to localhost:3000/webhooks/stripe`
y actualizar `.env`, o en producción verificar el secret del endpoint en
dashboard.stripe.com/webhooks.
