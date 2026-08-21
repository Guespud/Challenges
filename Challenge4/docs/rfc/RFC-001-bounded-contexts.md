# RFC-001: Bounded contexts de Vitalis Clinic

**Fecha:** 2026-08-20
**Estado:** Propuesto (pendiente de tu revisión y aprobación)
**Decisor(es):** Alejo

## Contexto

El backend del Challenge 3 es un monolito Fastify: un solo proceso HTTP, un solo
proceso worker, una sola base Postgres, un Redis compartido para BullMQ. Funciona,
pero el brief de Challenge 4 plantea el escenario de que la clínica creció a 5
sedes y el acoplamiento entre "equipos" empieza a doler — en particular, el
equipo de notificaciones no puede desplegar sin coordinarse con el equipo de
citas, porque viven en el mismo proceso y el mismo deploy.

La pregunta que este RFC responde: **¿dónde se cortan los servicios, quién es
dueño de qué dato, y cómo se comunican entre sí sin volver a compartir estado?**

## Opciones consideradas

**Número de servicios:**
1. **3 servicios (Auth, Appointments+Payments juntos, Notifications)** — el
   mínimo que pide el brief.
   - Pros: menos piezas que operar, menos sagas cross-servicio.
   - Contras: Payments (Stripe, webhooks, idempotencia, reembolsos) y
     Appointments (máquina de estados de la cita) son responsabilidades muy
     distintas que hoy ya viven en archivos separados dentro del monolito; forzarlas
     juntas no resuelve el problema real (el equipo de pagos también necesita
     desplegar sin esperar al de citas).
2. **4 servicios: Auth, Appointments, Payments, Notifications** (elegida).
   - Pros: cada servicio tiene un solo motivo para cambiar (Single Responsibility
     a nivel de servicio). Payments puede evolucionar su integración con Stripe
     sin tocar Appointments. Notifications sigue siendo el servicio "más
     desechable" del sistema (sin BD propia).
   - Contras: más piezas de infraestructura (más contenedores, más colas, más
     posibles puntos de falla de red), y aparece un caso de estudio real de saga
     distribuida entre Appointments y Payments que no existía en el monolito.

**Comunicación entre servicios:**
1. **Solo eventos (pub/sub puro)** — ni Appointments ni Payments se llaman
   directo, todo pasa por streams.
   - Pros: desacoplamiento máximo.
   - Contras: crear una cita necesita el `checkoutUrl` de Stripe *en la misma
     respuesta HTTP* al paciente — no hay forma de esperar un evento asíncrono
     dentro de un request-response sin inventar polling o websockets, lo cual es
     más complejo que una llamada HTTP directa para este caso puntual.
2. **HTTP síncrono para lo que necesita respuesta inmediata + eventos para todo
   lo demás** (elegida). Ver más detalle en el ADR de sync vs async.
   - Pros: cada mecanismo se usa donde tiene sentido; no se fuerza un patrón
     único a todos los casos.
   - Contras: dos mecanismos de comunicación que mantener y entender, en vez de
     uno solo.

**Bus de eventos:**
1. **RabbitMQ** — más features (exchanges, routing, DLQ nativo).
   - Contras: pieza de infraestructura nueva a operar; el proyecto ya corre
     Redis para BullMQ, agregar RabbitMQ solo para esto duplica infraestructura
     sin necesidad clara a esta escala.
2. **Redis Streams** (elegida) — reusa el Redis que ya está corriendo.
   - Pros: consumer groups con ACK explícito (at-least-once) igual que
     RabbitMQ, cero infraestructura nueva, ya conocemos la herramienta.
   - Contras: menos maduro que RabbitMQ para topologías complejas de routing;
     no es un problema hoy porque los eventos son pocos y de forma fija
     (`UserRegistered`, `PaymentConfirmed`, `NotificationDelivered`).

## Decisión

Cuatro servicios, cada uno dueño exclusivo de sus tablas — ningún otro servicio
lee ni escribe directamente en la base de datos de otro:

| Servicio | Dueño de (tablas) | Responsabilidad |
|---|---|---|
| **Auth** | `User` | Registro, login, refresh tokens, roles |
| **Appointments** | `Appointment`, `AppointmentEvent`, `Service`, `DoctorAvailability`, `UserProjection` | Máquina de estados de la cita, disponibilidad, orquesta el pago (sin tocar Stripe directo) |
| **Payments** | `Payment`, `WebhookEvent`, `PendingCheckout` | Integración con Stripe, idempotencia de webhooks, reembolsos |
| **Notifications** | (sin BD propia) | Envío de email vía Resend, consume colas/eventos, no guarda estado |

**Cero estado compartido — el problema difícil y cómo se resolvió:**

`Appointment.patientId` / `doctorId` eran FKs reales a `User` en el monolito.
Entre servicios no hay FKs. Se resolvió con **proyección local por eventos**:
Auth publica `UserRegistered` en Redis Streams; Appointments consume ese evento
y mantiene su propia tabla `UserProjection` (`id, name, email, role`) como
caché de lectura. Es la opción que de verdad demuestra "cero estado
compartido, se publica como evento" en vez de esconder un acoplamiento
síncrono detrás de un `GET /internal/users/:id`.

**El saga de pago (el otro problema difícil):**

Appointments no llama a Stripe directo. Crea la cita en `pending` y hace **una
llamada HTTP síncrona** a `POST /internal/checkout-sessions` en Payments (con
un token compartido `x-internal-token`, servicio-a-servicio, nunca expuesto en
el gateway) para obtener el `checkoutUrl` que el paciente necesita en el acto.
Payments confirma el pago (vía webhook de Stripe) y publica `PaymentConfirmed`;
Appointments lo consume de forma asíncrona y transiciona la cita a `paid`. La
cancelación con reembolso usa el mismo patrón: HTTP síncrono
Appointments → Payments para pedir el refund, evento de vuelta si hace falta.
Esto se documenta en detalle en el ADR de transacciones distribuidas.

**Colas BullMQ vs eventos Redis Streams — no son lo mismo, y ambos se usan:**

- **Streams** para hechos de dominio que otros servicios necesitan saber que
  pasaron (`UserRegistered`, `PaymentConfirmed`, `NotificationDelivered`).
- **BullMQ cross-servicio** (`notifications`, `reminders`) para trabajo que
  necesita *delay* (recordatorio a 24h) o *retry con backoff*, que Streams no
  da nativo. Notifications consume estas colas, no las de Streams.
- **BullMQ interno** (`hold-expiry` en Appointments, `reconciliation` en
  Payments) nunca sale de su propio servicio.

## Consecuencias

- **Positivas:** cada servicio se puede desplegar y escalar sin coordinar con
  los otros tres. Tirar Notifications no rompe la reserva de citas (las citas
  se siguen creando; el email queda en cola reintentando). El código de Stripe
  vive en un solo lugar (Payments) en vez de esparcido.
- **Negativas / tradeoffs:** la consistencia ya no es transaccional entre
  Appointments y Payments — hay una ventana donde la cita existe en `pending`
  y el checkout de Stripe también, pero si algo falla a mitad de camino hace
  falta reconciliación (el worker de `reconciliation` en Payments ya cubre
  esto). Más servicios = más contenedores, más URLs internas que configurar,
  más superficie para bugs de red que en el monolito no existían (y de hecho
  aparecieron: colisión de clientes Prisma, poda de `npm install`, etc. — ver
  el historial de la implementación).
- **Cosas a monitorear:** el consumer de Redis Streams reclama mensajes no-
  ACKed vía `XAUTOCLAIM` (idle > 30s, hasta 5 intentos antes de mandarlos a un
  stream `${stream}:dead-letter`) — validado manualmente forzando un consumer
  fantasma que lee y nunca ACKea, y confirmando que el consumer real lo
  reclama y procesa al volver a levantar. Sigue pendiente monitorear en
  producción cuántos mensajes terminan en dead-letter y con qué frecuencia.

## Referencias

- Implementación completa en `services/*` y `gateway/` de este monorepo.
- Docker Compose (`docker-compose.yml`) valida esta topología corriendo
  localmente los 4 servicios + gateway + Postgres + Redis.
