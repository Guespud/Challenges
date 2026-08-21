# Postmortem (simulado): caída de Payments en horario pico

**Fecha del incidente (simulado):** 2026-08-24, 11:40–12:15 (35 min)
**Severidad:** Alta — afecta la función principal del producto (reservar y
pagar citas) en horario de mayor tráfico.
**Autor:** Alejo
**Estado:** Resuelto, con acciones de seguimiento pendientes

## Resumen

El servicio `payments` dejó de responder durante 35 minutos en horario pico
(mañana, cuando las 5 clínicas concentran la mayoría de reservas del día). La
causa raíz fue el pool de conexiones a `vitalis_payments` agotándose después
de un pico de tráfico combinado con el job de `reconciliation` corriendo al
mismo tiempo que un lote grande de webhooks de Stripe. El servicio de citas
(`appointments`) empezó a devolver 503 en la creación y cancelación de citas
apenas Payments dejó de responder, porque esa llamada es síncrona por diseño
(ver ADR-009). El resto del sistema — login, listar citas existentes,
disponibilidad de médicos, recordatorios y confirmaciones de citas ya pagadas
— siguió funcionando con normalidad durante todo el incidente.

## Impacto

- **Roto:** `POST /appointments` (crear cita nueva) y `POST
  /appointments/:id/cancel` (cancelar cita pagada) — ambos dependen de una
  llamada HTTP síncrona a Payments. Devolvían `503 Service Unavailable`
  (`serviceUnavailable()` en `payments-client.ts`, que envuelve cualquier
  fallo de red o `fetch` hacia Payments).
- **No roto:** login/registro (Auth no depende de Payments), `GET
  /appointments` y `GET /doctors/:id/availability` (Appointments lee de su
  propia base), recordatorios y confirmaciones de citas que ya estaban
  pagadas antes del incidente (viven en colas BullMQ que no tocan Payments),
  el panel admin en modo lectura.
- **Alcance:** todas las clínicas por igual — no hay aislamiento por tenant
  en este challenge (ver Challenge 5).
- **Usuarios afectados (estimado):** cualquier paciente que intentó reservar
  o cancelar una cita nueva en esa ventana de 35 minutos. Los que ya tenían
  una cita pagada de antes no notaron nada.

## Línea de tiempo

| Hora | Evento |
|---|---|
| 11:38 | El job de `reconciliation` de Payments arranca su corrida programada (cada 5 min) y empieza a escanear `PendingCheckout` sin resolver. |
| 11:40 | Un pico de tráfico normal de horario pico coincide con la corrida — el pool de conexiones de Prisma en Payments (`@prisma/adapter-pg`, tamaño de pool por defecto) se agota entre las consultas del reconciliation worker y las requests entrantes de `/internal/checkout-sessions`. |
| 11:41 | `payments` empieza a devolver timeouts en requests nuevas. `appointments` recibe estos timeouts como fallo de `createCheckoutSession()` / `refundPayment()` y responde `503` al cliente. |
| 11:43 | (Simulado) Prometheus dispara la alerta RED de `error_rate` sobre el endpoint `POST /internal/checkout-sessions` de Payments — ver nota sobre métricas más abajo. |
| 11:50 | Se identifica el pool de conexiones agotado revisando logs de Payments (`PrismaClientKnownRequestError: Timed out fetching a new connection from the pool`). |
| 12:00 | Se reinicia el contenedor de `payments` (`docker compose restart payments`) para liberar el pool inmediatamente, mientras se prepara un fix. |
| 12:05 | El servicio vuelve a responder con normalidad; la cola de creaciones de cita que fallaron con 503 no se reintenta sola (el cliente HTTP del paciente ya recibió el error). |
| 12:15 | Se confirma que no quedaron `PendingCheckout` huérfanos revisando el propio reconciliation worker en su siguiente corrida. |

## Causa raíz

Dos fuentes de carga sobre la misma base de datos (`vitalis_payments`)
compitiendo por el mismo pool de conexiones sin que ninguna tuviera prioridad
ni límite propio: el tráfico normal de creación de checkouts, y el job
periódico de reconciliación que escanea toda la tabla `PendingCheckout` sin
paginar. En tráfico normal nunca se notó porque el volumen de citas de una
sola clínica de prueba es bajísimo; con 5 clínicas reales en horario pico, el
job de reconciliación pasó de ser "background barato" a competir de verdad
por el mismo recurso limitado.

**Por qué se propagó a Appointments:** es exactamente el tradeoff que ya
señala el ADR-009 — la llamada Appointments→Payments es síncrona a propósito
(el paciente necesita el `checkoutUrl` en el acto), así que un Payments lento
o caído bloquea directamente la creación de citas. No es un bug nuevo, es la
consecuencia esperada de esa decisión arquitectónica, y es justo el
comportamiento documentado en la sección de consecuencias de ese ADR.

## Detección

En este challenge las métricas RED (Prometheus + Grafana) todavía no están
implementadas (pendiente en la lista de entregables) — este postmortem asume
que ya existen para el escenario simulado, porque sin ellas la detección
real habría dependido de que un paciente o el staff reportara el error, con
mucho más tiempo hasta notarlo. Esto en sí mismo es un hallazgo del
ejercicio: **el orden de trabajo importa** — un sistema partido en servicios
sin observabilidad es más difícil de diagnosticar que el monolito original,
porque ahora hay que saber *cuál* de los 4 servicios está fallando antes de
poder mirar sus logs.

## Resolución

1. Reinicio del contenedor de `payments` para liberar el pool de conexiones
   de inmediato (mitigación, no fix).
2. Fix real aplicado después del incidente: limitar el tamaño de página del
   scan de `reconciliation.worker.ts` (dejó de traer toda la tabla de una
   vez) y mover su corrida fuera de los minutos `:00`/`:05` exactos donde
   suele concentrarse tráfico de reservas al inicio de cada franja horaria
   de citas.
3. Verificación: ningún `PendingCheckout` quedó sin resolver (el mismo
   worker de reconciliación, ya arreglado, lo habría corregido solo de todos
   modos — es la misma red de seguridad del ADR-010).

## Acciones de seguimiento

- [ ] Configurar límite de pool de conexiones explícito por servicio en vez
      del default de Prisma, dimensionado para el tráfico esperado.
- [ ] Agregar timeout + circuit breaker en `payments-client.ts` (hoy un
      Payments lento hace esperar a Appointments hasta el timeout de
      `fetch` por defecto — sin límite explícito, eso puede tardar bastante
      y encadenar timeouts en el propio Appointments).
- [ ] Implementar las métricas RED reales (Prometheus + Grafana) — sin esto,
      este mismo incidente en producción real se habría detectado por
      quejas de pacientes, no por alertas.
- [ ] Evaluar si el reconciliation worker necesita su propio límite de pool
      de conexiones (una conexión dedicada, no compartida con las requests
      HTTP) para que un job de background nunca pueda degradar el camino
      caliente del servicio.

## Lecciones aprendidas

- La decisión de ADR-009 (HTTP síncrono Appointments→Payments) es correcta
  para el dominio, pero significa que **la disponibilidad de Payments es un
  límite duro para la disponibilidad de crear/cancelar citas** — cualquier
  trabajo de background dentro de Payments (como reconciliación) compite
  por los mismos recursos que ese camino crítico, y necesita aislarse.
- Partir el monolito en servicios no elimina los cuellos de botella, los
  mueve: en el monolito, un job de reconciliación lento hubiera competido
  por el mismo pool que *todo* el sistema (peor); en servicios separados,
  compite solo con Payments (mejor, pero Payments es exactamente el
  servicio del que depende síncronamente la operación más importante del
  producto).
