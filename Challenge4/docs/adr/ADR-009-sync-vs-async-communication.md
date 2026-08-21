# ADR-009: Comunicación sync (HTTP) vs async (eventos) entre servicios

**Fecha:** 2026-08-20
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

Al partir el monolito en 4 servicios (ver RFC-001), Appointments necesita datos
y acciones que ahora viven en otros servicios: el nombre del médico/paciente
(dueño: Auth), y la sesión de checkout / el reembolso de Stripe (dueño:
Payments). Había que decidir, para cada una de estas interacciones, si se
resuelve con una llamada HTTP directa (síncrona, bloqueante, respuesta
inmediata) o con un evento (asíncrono, desacoplado, sin respuesta inmediata).
Usar un solo mecanismo para todo simplifica el mental model, pero cada caso
real de este dominio tiene requisitos distintos.

## Opciones consideradas

1. **Todo síncrono (HTTP interno para todo, incluida la proyección de
   usuarios).**
   - Pros: un solo patrón, fácil de razonar, sin necesidad de un bus de
     eventos.
   - Contras: Appointments tendría que llamar a Auth en cada `GET
     /appointments/mine` o `/doctors` para resolver nombres — latencia extra
     en el camino de lectura más frecuente del sistema, y un acoplamiento
     runtime real (si Auth está caído, Appointments no puede ni listar citas
     aunque no necesite crear ninguna).
2. **Todo asíncrono (incluido el checkout de Stripe).**
   - Pros: desacoplamiento máximo, ningún servicio bloquea a otro.
   - Contras: el paciente necesita el `checkoutUrl` de Stripe *en la misma
     respuesta HTTP* de `POST /appointments` para poder pagar. No hay forma
     de devolver eso de forma asíncrona sin inventar polling desde el
     frontend o WebSockets — complejidad más alta que una llamada HTTP
     directa para un caso que ya es inherentemente request-response.
3. **Híbrido: síncrono donde el caller necesita el resultado en el mismo
   request-response; asíncrono para todo lo demás** (elegida).

## Decisión

- **HTTP síncrono interno** (`x-internal-token`, nunca expuesto en el
  gateway) solo para dos llamadas, ambas con la misma forma: *Appointments
  necesita un resultado de Payments antes de poder responderle al cliente*:
  - `POST /internal/checkout-sessions` — crear la cita necesita devolver un
    `checkoutUrl` real en el acto.
  - `POST /internal/payments/:appointmentId/refund` — cancelar necesita
    saber si el reembolso se pudo procesar antes de confirmarle la
    cancelación al usuario (si el refund falla, la cita **no** se cancela,
    ver `appointment.service.ts::cancelAppointment`).
- **Eventos (Redis Streams) para todo lo que no bloquea una respuesta HTTP
  inmediata**:
  - `UserRegistered` (Auth → Appointments): la proyección de usuarios no
    tiene que estar lista en el mismo milisegundo que se registra alguien;
    llega eventualmente y Appointments la consume cuando puede.
  - `PaymentConfirmed` (Payments → Appointments): el pago se confirma en un
    webhook de Stripe que no tiene nada que ver con el request original del
    paciente — es asíncrono por naturaleza, forzarlo a síncrono no tendría
    ni con qué llamada HTTP corresponderlo.
  - `NotificationDelivered` (Notifications → Appointments): el resultado del
    envío de email nunca es parte de ningún request-response; es
    puramente informativo para el log de eventos de la cita.

**Regla general para decisiones futuras:** si el caller necesita el
resultado antes de poder responderle a *su* cliente, es HTTP síncrono. Si el
resultado es "un hecho que pasó y a alguien le interesa saber", es un
evento.

## Consecuencias

- **Positivas:** las dos únicas dependencias runtime síncronas del sistema
  (Appointments→Payments) son explícitas y fáciles de encontrar — no hay
  llamadas HTTP internas escondidas en otros lugares. El resto del sistema
  se degrada con gracia: apagar Notifications no rompe la creación de citas.
- **Negativas / tradeoffs:** si Payments está caído, **crear o cancelar
  citas también falla** (no hay fallback local) — es un acoplamiento
  deliberado, no un accidente: el dominio real exige que el pago exista
  antes de confirmar la cita. Mitigado parcialmente por el ADR-010
  (reconciliación).
- **Cosas a monitorear:** si en el futuro aparece un tercer caso "necesito
  el resultado ya" entre otro par de servicios, revisar si de verdad lo
  necesita en el mismo request o si se puede resolver con un patrón
  optimista (responder "en proceso" y confirmar después vía evento/websocket).

## Referencias

- `services/appointments/src/lib/payments-client.ts`
- `services/appointments/src/workers/event-consumers.ts`
- RFC-001-bounded-contexts.md
