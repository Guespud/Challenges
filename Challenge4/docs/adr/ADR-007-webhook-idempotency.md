# ADR-007: Estrategia de idempotencia para webhooks de Stripe

**Fecha:** 2026-07-26
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

Stripe garantiza *at-least-once delivery* de webhooks, no *exactly-once*: el mismo
evento (`payment_intent.succeeded`, por ejemplo) puede llegar dos veces por
reintentos de red, timeouts del lado de Stripe, o porque nuestro servidor tardó en
responder 200. Si el handler del webhook no es idempotente, una entrega duplicada
puede: mover una cita dos veces por el ciclo de estados, crear dos filas `Payment`
para el mismo cobro, o disparar dos emails de confirmación. Necesitamos que
procesar el mismo evento N veces tenga el mismo efecto que procesarlo una vez.

## Opciones consideradas

1. **Confiar en que el estado de la cita ya es `confirmed`/`paid` y no volver a
   escribir** (idempotencia "implícita" por chequeo de estado actual).
   - Pros: no requiere tabla nueva.
   - Contras: hay una ventana de carrera real: si dos entregas del mismo evento
     llegan casi simultáneas, ambos requests pueden leer `status = pending` antes
     de que el primero termine de escribir `confirmed`. Sin un lock o constraint,
     ambos pasan la validación y se duplica el efecto (dos `Payment`, dos emails).
2. **Deduplicar en la capa de colas** (encolar el procesamiento y dejar que BullMQ
   deduplique por `jobId`).
   - Pros: reusa infraestructura que ya existe para otras colas.
   - Contras: BullMQ deduplica por `jobId` dentro de la ventana en que el job vive
     en Redis; si Redis se reinicia o el job ya se completó y se limpió, un evento
     que llega horas después ya no tiene con qué deduplicar. No es una garantía
     permanente, y la fuente de verdad de "¿ya procesé este evento?" debe vivir
     donde vive el resto del estado del negocio: Postgres.
3. **Tabla `WebhookEvent` con `stripeEventId` único, insertada dentro de la misma
   transacción que aplica el efecto** — elegida.
   - Pros: garantía permanente y transaccional. El `event.id` de Stripe es
     globalmente único y estable; un `INSERT ... UNIQUE` que falla por conflicto
     es la señal de "ya procesado", sin necesidad de locks explícitos ni de
     confiar en el estado de negocio como proxy de idempotencia.
   - Contras: una tabla más, un `INSERT` extra por evento.

## Decisión

Cada webhook de Stripe se procesa dentro de una única transacción de Prisma:

1. Verificar la firma (`stripe.webhooks.constructEvent`) — si falla, 400 y no se
   toca la BD.
2. Intentar `INSERT INTO webhook_events (stripe_event_id, type) VALUES (...)`
   dentro de la transacción. Si el `stripeEventId` ya existe, el `INSERT` falla
   por el constraint único → se captura ese error específico, se hace `COMMIT` de
   una transacción vacía (o `ROLLBACK`, es equivalente) y se responde **200**
   igual — un duplicado no es un error, es el comportamiento esperado de
   at-least-once delivery. No se reintenta el efecto de negocio.
3. Si el `INSERT` tuvo éxito (evento nuevo), en la misma transacción se aplica el
   efecto: `Appointment.status = confirmed`, luego `paid`, se crea `Payment`, se
   registran los `AppointmentEvent` correspondientes.
4. Solo *después* del `COMMIT` exitoso se encola el email de confirmación
   (BullMQ) — encolar dentro de la transacción arriesgaría encolar un job para
   una transacción que después hace rollback.

La clave de idempotencia es `stripeEventId`, no `paymentIntentId`: un mismo
PaymentIntent puede generar varios eventos distintos (`succeeded`, luego un
`charge.refunded` más tarde) y cada uno necesita su propia deduplicación.

## Consecuencias

- **Positivas:** la garantía es a nivel de base de datos (constraint único +
  transacción), no depende de que la lógica de la aplicación "se acuerde" de
  chequear el estado antes de escribir. Es correcta incluso bajo condiciones de
  carrera (dos requests concurrentes para el mismo evento: solo uno gana el
  `INSERT`, el otro recibe la violación de constraint y responde 200 sin
  duplicar nada).
- **Negativas / tradeoffs:** la tabla `webhook_events` crece indefinidamente (no
  hay TTL/purga en el MVP) — aceptable para el volumen de este challenge, pero
  a monitorear si esto fuera producción real.
- **Cosas a monitorear:** si en el futuro se necesita reprocesar un evento a
  propósito (ej. un bug corrompió el efecto de un pago ya registrado), hace falta
  un mecanismo explícito de "borrar la fila de `webhook_events` y reenviar desde
  el dashboard de Stripe" — no hay endpoint de reproceso automático.

## Referencias

- [Stripe docs — Webhook best practices, idempotency](https://docs.stripe.com/webhooks)
- `back/src/routes/webhooks.routes.ts`, `back/prisma/schema.prisma` (modelo `WebhookEvent`)
