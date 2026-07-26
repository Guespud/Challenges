# ADR-008: Estrategia de retry para jobs en cola

**Fecha:** 2026-07-26
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

Tenemos efectos secundarios que dependen de servicios externos que pueden fallar
transitoriamente: envío de email (Resend) y reembolsos (Stripe). Un fallo
transitorio (timeout, rate limit, 500 del proveedor) no debe convertirse en un
fallo permanente ni bloquear el flujo principal de la cita. Pero tampoco queremos
reintentar para siempre un fallo que sí es permanente (email inválido, tarjeta que
ya no existe) — eso satura la cola y oculta el problema real.

## Opciones consideradas

1. **Sin retry: si falla, se marca como fallido de inmediato.**
   - Pros: simple, no hay lógica de backoff.
   - Contras: la enorme mayoría de fallos de proveedores externos (email, Stripe)
     son transitorios (rate limit, timeout de red). Marcar como fallido en el
     primer intento genera falsos negativos que un simple reintento hubiera
     resuelto.
2. **Retry infinito con intervalo fijo.**
   - Pros: nunca se "rinde".
   - Contras: si el fallo es permanente (email inválido), reintenta para siempre,
     satura la cola y esconde el problema en vez de escalarlo a un humano.
3. **Retry acotado (3 intentos) con backoff exponencial, luego dead-letter
   (estado terminal `*_failed`)** — elegida.
   - Pros: absorbe fallos transitorios (la mayoría) sin intervención humana;
     después de 3 intentos, se rinde explícitamente y dejar rastro visible
     (`AppointmentEvent` + panel admin) en vez de reintentar en silencio para
     siempre.
   - Contras: hay una ventana (los 3 intentos, backoff 1m/5m/15m ≈ 21 min máx.)
     durante la cual el efecto todavía no ocurrió ni se marcó como fallido.

## Decisión

Configuración de BullMQ por cola:

```ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 }, // 1min, 2min, 4min (BullMQ multiplica por 2^intento)
  removeOnComplete: { age: 86_400 },   // limpia jobs exitosos después de 1 día
  removeOnFail: false,                  // los fallidos se conservan para inspección manual
}
```

`removeOnFail: false` **es** la estrategia de dead-letter elegida: en vez de
una cola separada, el propio "failed set" de BullMQ (respaldado en Redis)
retiene los jobs que agotaron sus 3 intentos, indexados por cola, hasta que
alguien los inspeccione o limpie manualmente. Se descartó una cola de
dead-letter dedicada (mover el job a `reminders-dlq`, por ejemplo) por ser
complejidad extra sin beneficio real a esta escala: el "failed set" ya es
consultable (`queue.getFailed()`) y el efecto de negocio (marcar
`reminder_failed`/`notification_failed`) ya deja rastro en Postgres, que es
donde el staff realmente mira el estado, no en Redis.

Al agotar los intentos, el worker captura el evento `failed` de la cola y:
- Actualiza el registro relacionado a su estado terminal de fallo
  (`Payment.status = refund_failed` / `AppointmentEvent` tipo
  `reminder_failed` o `notification_failed`).
- **No** vuelve a encolar automáticamente — un reintento manual desde el panel
  admin es una acción explícita del staff, no un job automático (evita loops).

Distinción importante: el job de `hold-expiry` (expirar citas `pending` sin pago)
**no** usa esta estrategia — no tiene sentido reintentarlo, porque es idempotente
por diseño (solo actúa si la cita sigue en `pending`; si ya se pagó, el job no
hace nada y no falla). El job de `reconciliation` tampoco reintenta: corre cada 5
minutos igual, así que un fallo se autocorrige en el siguiente tick sin necesidad
de lógica de retry explícita.

## Consecuencias

- **Positivas:** los fallos transitorios (la mayoría en la práctica) se resuelven
  solos; los fallos permanentes quedan visibles y accionables en vez de
  reintentarse en silencio para siempre; distinguir qué colas necesitan retry de
  cuáles no evita reintentar trabajo que ya es idempotente por otra vía.
- **Negativas / tradeoffs:** un paciente puede tardar hasta ~7 minutos en recibir
  su email de confirmación si el primer intento falla (1min + 2min de backoff
  antes del tercer intento) — aceptable para confirmaciones, se debe revisar si
  esto se usa para algo con requisito de latencia más estricto.
- **Cosas a monitorear:** si el volumen de jobs fallidos (`removeOnFail: false`)
  crece sin que el staff los revise, la cola de Redis acumula memoria — hace
  falta un proceso (manual por ahora) de limpiar jobs fallidos ya atendidos.

## Referencias

- [BullMQ docs — Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs)
- `back/src/queues/`, `back/src/workers/`
