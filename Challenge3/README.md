# Vitalis Clinic — Challenge 3: "Operación clínica"

Plataforma de reserva de citas para una clínica ficticia, con cobro en línea
(Stripe), notificaciones por email (Resend), recordatorios y cancelaciones
automatizadas (BullMQ + Redis), y un panel administrativo para el staff.

- **Diseño completo**: [`SPEC.md`](SPEC.md) — modelo de datos, diagrama de
  estados de la cita, matriz de error paths, endpoints.
- **Decisiones arquitectónicas**: [`docs/adr/`](docs/adr/) — ver especialmente
  [ADR-007 (idempotencia de webhooks)](docs/adr/ADR-007-webhook-idempotency.md)
  y [ADR-008 (estrategia de retry)](docs/adr/ADR-008-retry-strategy.md).
- **Runbook**: [`docs/runbook.md`](docs/runbook.md) — qué hacer si algo falla.
- **Guion de explicación**: [`docs/guion-explicacion.md`](docs/guion-explicacion.md).
- **Deploy a producción (Railway)**: [`docs/deploy-railway.md`](docs/deploy-railway.md).
- **Backend**: `back/` — Fastify + TypeScript estricto + Prisma + PostgreSQL +
  BullMQ + Redis + Stripe + Resend + Sentry + pino.
- **Frontend**: `front/` — React + TypeScript + Vite + TailwindCSS. Booking del
  paciente (médico → servicio → horario → checkout Stripe), "Mis citas",
  agenda de solo lectura del médico, y panel de staff (ver/filtrar/cancelar
  citas, log de eventos).

## Producción (Railway)

https://challenges-production-bd6a.up.railway.app

Usuarios de prueba — los mismos en local y en producción (mismo seed):

| Rol | Email | Password | Qué ve |
| --- | --- | --- | --- |
| patient | `alejo@yopmail.com` | `Alejo#2026` | Agendar / Mis citas |
| doctor | `doctora@vitalis-clinic.test` | `Vitalis#2026` | Mi agenda (solo lectura) |
| staff | `staff@vitalis-clinic.test` | `Vitalis#2026` | Panel de citas (staff) |

## Quickstart

```bash
# 1. Redis + Postgres corriendo
docker compose up -d redis     # levanta Redis en localhost:6379
# Postgres: local, Docker, o managed — crear las BD "vitalis" y "vitalis_test"

cd back
npm install
cp .env.example .env           # completar STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
cp .env.test.example .env.test # BD separada para tests, ver "Tests" abajo
npx prisma generate
npx prisma migrate dev
npx prisma db seed

npm run dev                     # servidor HTTP, http://localhost:3000
npm run worker                  # en otra terminal: workers de BullMQ (obligatorio para pagos/recordatorios)

# en otra terminal
cd ../front
npm install
npm run dev                     # http://localhost:5173
```

Para probar el flujo de pago completo en local hace falta reenviar los
webhooks de Stripe con la CLI oficial:

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
# copiar el whsec_... que imprime a STRIPE_WEBHOOK_SECRET en .env
```

Sin una cuenta Stripe test configurada, el flujo funciona hasta el botón
"Continuar a pago" — la creación del Checkout Session falla ahí de forma
controlada (no crashea la app).

Los usuarios de prueba (creados por el seed) son los mismos que en
producción — ver la tabla arriba.

## Tests

```bash
cd back
npm test
```

Corre contra **`vitalis_test`**, una base separada de la de `npm run dev`
(`vitalis`) — así los tests no contaminan los datos con los que estás
probando la app a mano. Se selecciona automáticamente: `env.ts` carga
`.env.test` cuando `NODE_ENV=test` (lo que ya hace el script `npm test`).

Cubre: máquina de estados (todas las transiciones válidas/inválidas),
idempotencia del webhook de Stripe (mismo evento duplicado, dos eventos
distintos para la misma cita), cálculo de slots disponibles.

## Estado del challenge

**Backend: completo y probado.** Modelo de datos, máquina de estados, hold con
expiración, checkout de Stripe, webhook idempotente, refund al cancelar,
colas con retry/backoff (recordatorios, notificaciones), job de reconciliación,
logging estructurado con `request_id`, panel admin (API).

**Frontend: completo para el alcance de este challenge.** Verificado en
navegador (Playwright): login por rol, booking con selección de horarios
reales, "Mis citas", panel de staff. Paleta azul/blanco/negro/gris. Lo único
no verificable sin una cuenta Stripe test real es el pago en sí.

**Deploy: en producción en Railway.** 5 servicios (Postgres, Redis, backend
HTTP, backend worker, frontend), URLs arriba. Webhook de Stripe configurado
apuntando al backend real. Pendiente de verificar con datos reales: envío de
email (`RESEND_API_KEY` sigue en placeholder) y Sentry (`SENTRY_DSN` vacío).
Guía completa del proceso en [`docs/deploy-railway.md`](docs/deploy-railway.md).
