# Vitalis Clinic — Backend

API REST para la plataforma de reserva de citas Vitalis Clinic (Challenge 3).
Fastify + TypeScript estricto + Prisma + PostgreSQL + BullMQ + Redis + Stripe
+ Resend + Sentry + pino. Ver el diseño completo en
[`../SPEC.md`](../SPEC.md).

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (local, Docker, o managed)
- Redis (`docker compose up -d redis` desde la raíz del proyecto)

## Setup local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y ajustar los valores:

   ```bash
   cp .env.example .env
   ```

   | Variable | Descripción |
   | --- | --- |
   | `DATABASE_URL` | Cadena de conexión Postgres |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos para firmar tokens, distintos entre sí |
   | `PORT` | Puerto del servidor (default `3000`) |
   | `REDIS_URL` | Cadena de conexión Redis (default `redis://localhost:6379`) |
   | `STRIPE_SECRET_KEY` | Secret key de Stripe en test mode (`sk_test_...`) |
   | `STRIPE_WEBHOOK_SECRET` | Lo da `stripe listen` en local, o el dashboard de Stripe en producción |
   | `RESEND_API_KEY` / `EMAIL_FROM` | Envío de emails de confirmación/recordatorio |
   | `SENTRY_DSN` | Opcional — sin esto, Sentry simplemente no se inicializa |
   | `HOLD_TTL_MINUTES` / `REMINDER_HOURS_BEFORE` | Tienen default (15 y 24) |

3. Generar el cliente de Prisma y aplicar migraciones:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Poblar datos de prueba (médica + staff + paciente + servicios + horarios):

   ```bash
   npx prisma db seed
   ```

   Usuarios creados:

   | Rol | Email | Password |
   | --- | --- | --- |
   | patient | `alejo@yopmail.com` | `Alejo#2026` |
   | doctor | `doctora@vitalis-clinic.test` | `Vitalis#2026` |
   | staff | `staff@vitalis-clinic.test` | `Vitalis#2026` |

5. Levantar el servidor **y** el worker de colas (en dos terminales — ver
   [`../docs/runbook.md`](../docs/runbook.md) para qué pasa si el worker no
   corre):

   ```bash
   npm run dev       # http://localhost:3000
   npm run worker    # procesa hold-expiry, recordatorios, notificaciones, reconciliación
   ```

Para probar el flujo de pago completo hace falta además `stripe listen` — ver
[`../README.md`](../README.md).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor con recarga automática (`tsx watch`) |
| `npm run worker` | Workers de BullMQ con recarga automática |
| `npm run build` | Compila a `dist/` (server + worker) |
| `npm start` | Corre el build de producción del servidor |
| `npm run start:worker` | Corre el build de producción del worker |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest contra `vitalis_test` (ver `.env.test`, no contamina los datos de `npm run dev`) |
| `npm run prisma:generate` | Regenera el cliente de Prisma tras cambiar el schema |
| `npm run prisma:migrate` | Crea y aplica una nueva migración |

## Estructura

```
src/
  config/env.ts        validación de variables de entorno con Zod
  content/es.json       diccionario centralizado de mensajes
  lib/                   prisma, jwt, redis, stripe, email, logger, sentry, errores tipados
  plugins/auth.ts        middleware de autenticación + guard por rol
  domain/                máquina de estados de la cita
  schemas/                Zod: auth, appointment
  services/               lógica de negocio (sin Fastify de por medio)
  routes/                 capa HTTP delgada: parsea, delega al service, responde
  queues/queues.ts        definición de colas BullMQ + config de retry
  workers/                4 workers: hold-expiry, reminders, notifications, reconciliation
  app.ts / server.ts      build de Fastify + entrypoint del servidor HTTP
  worker.ts               entrypoint de los workers (proceso separado)
prisma/
  schema.prisma
  seed.ts
test/                     unit + integración (Vitest), contra vitalis_test
```

## Decisiones documentadas

Ver `../docs/adr/` — en particular
[ADR-007](../docs/adr/ADR-007-webhook-idempotency.md) (idempotencia de
webhooks) y [ADR-008](../docs/adr/ADR-008-retry-strategy.md) (estrategia de
retry). El resto de las ADRs (auth, password, Prisma driver) vienen heredadas
de Challenge 2 y siguen aplicando igual.
