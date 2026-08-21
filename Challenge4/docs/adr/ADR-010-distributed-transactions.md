# ADR-010: Estrategia de transacciones distribuidas (saga de pago)

**Fecha:** 2026-08-20
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

En el monolito, crear una cita y cobrarla era una operación cuasi-atómica:
todo vivía en el mismo proceso y la misma base Postgres, así que un `try/catch`
alrededor de la llamada a Stripe bastaba. Partido en servicios, `Appointment`
vive en la base de Appointments y `Payment`/`PendingCheckout` en la de
Payments — **no hay transacción de base de datos que abarque a las dos**. Hace
falta una estrategia explícita para qué pasa cuando una mitad de la operación
tiene éxito y la otra falla (Stripe no responde, la escritura en Payments
falla después de crear la sesión, el webhook de confirmación nunca llega,
etc.).

## Opciones consideradas

1. **Two-phase commit (2PC) real entre las dos bases.**
   - Pros: consistencia fuerte, sin ventanas de inconsistencia.
   - Contras: Postgres soporta 2PC (`PREPARE TRANSACTION`) pero acoplaría a
     Appointments y Payments a nivel de infraestructura de base de datos —
     exactamente el tipo de acoplamiento que se supone que estamos
     eliminando al separar servicios. Además Stripe (un sistema externo) no
     participa en ningún protocolo de 2PC, así que 2PC solo resolvería la
     mitad del problema.
2. **Saga coreografiada (choreography) — cada servicio reacciona a eventos
   del otro sin un orquestador central.**
   - Pros: totalmente desacoplado.
   - Contras: para *iniciar* el checkout hace falta el `checkoutUrl` en la
     respuesta HTTP inmediata (ver ADR-009) — una coreografía pura basada
     solo en eventos no puede devolver eso sin inventar un mecanismo de
     espera adicional.
3. **Saga orquestada por Appointments, con compensación explícita y
   reconciliación periódica como red de seguridad** (elegida).

## Decisión

Appointments actúa como **orquestador** de la saga de pago:

```
1. Appointments crea Appointment(status=pending)
2. Appointments → HTTP → Payments: crear checkout session
   ├─ éxito: guarda stripeCheckoutSessionId, responde al paciente con checkoutUrl
   └─ falla: la creación de la cita entera falla (rollback local, nada que compensar
             del lado de Payments porque nunca llegó a crear nada)
3. [tiempo pasa, el paciente paga en Stripe]
4. Stripe → webhook → Payments: confirma el pago
   Payments escribe Payment(status=succeeded), publica PaymentConfirmed
5. Appointments consume PaymentConfirmed (async) → Appointment.status = paid
```

**Compensación para cancelación** (el caso inverso, cita ya pagada):

```
1. Appointments → HTTP → Payments: pedir refund
   ├─ éxito: Appointments transiciona a cancelled + AppointmentEvent(refund_issued)
   └─ falla: Appointments NO cambia de estado — AppointmentEvent(refund_failed)
             y le devuelve 409 al usuario ("reintenta o contacta soporte")
```

La cita cancelada-a-medias **nunca existe como estado válido**: o el refund
tuvo éxito y se cancela, o falló y se queda `paid` con un evento de auditoría
visible en el panel admin. Es una decisión deliberada de favorecer
consistencia sobre disponibilidad en este punto: preferimos que el staff vea
un refund fallido y lo resuelva a mano, a que el sistema cancele una cita sin
haber devuelto el dinero.

**Red de seguridad — reconciliación:** Payments mantiene su propia tabla
`PendingCheckout` (poblada cuando crea la sesión de Stripe) y un worker
(`reconciliation.worker.ts`) que cada 5 minutos revisa las sesiones que
quedaron sin resolver por más de N minutos, consulta el estado real en
Stripe, y si encuentra un pago exitoso que nunca generó su webhook (el caso
"Stripe cobró pero el webhook se perdió"), lo confirma igual — mismo camino
que `confirmPayment`, así que Appointments se entera vía el mismo evento
`PaymentConfirmed` de siempre, sin lógica especial en el consumidor.

## Consecuencias

- **Positivas:** no hay 2PC ni acoplamiento de infraestructura entre las
  bases. El caso feliz nunca deja estados intermedios raros. El worker de
  reconciliación cubre el caso real más común de fallo en sagas con
  servicios externos (webhook perdido), sin que Appointments necesite saber
  que existe.
- **Negativas / tradeoffs:** hay una ventana real de inconsistencia eventual
  entre "el paciente pagó en Stripe" y "`Appointment.status` dice `paid`"
  (normalmente milisegundos vía webhook, hasta 5 minutos en el peor caso si
  el webhook se pierde y hay que esperar al reconciliation worker). El
  sistema no tiene compensación automática para el caso "Payments creó la
  sesión pero Appointments se cayó antes de guardar el
  `stripeCheckoutSessionId`" — hoy esa sesión de Stripe queda huérfana
  (nadie la reconcilia porque `PendingCheckout` sí se creó en Payments, así
  que el reconciliation worker eventualmente la ve, pero no hay
  `Appointment` del lado de Appointments que actualizar; el diseño asume
  que este caso es raro porque las dos escrituras están separadas por
  milisegundos y el request completo o falla completo).
- **Cosas a monitorear:** si en producción el reconciliation worker empieza
  a encontrar casos con frecuencia (webhooks perdidos seguido), es señal de
  revisar la configuración del endpoint de webhook con Stripe antes de que
  sea un problema de UX (paciente pagó, ve la cita en `pending` por minutos).

## Referencias

- `services/payments/src/workers/reconciliation.worker.ts`
- `services/appointments/src/services/appointment.service.ts`
  (`createAppointment`, `cancelAppointment`, `applyPaymentConfirmed`)
- ADR-009-sync-vs-async-communication.md
- ADR-007-webhook-idempotency.md (heredado de Challenge 3, sigue aplicando
  dentro de Payments)
