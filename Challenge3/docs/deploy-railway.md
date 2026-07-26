# Deploy a producción — Railway

A diferencia de Challenge 2, acá no son 2 servicios sino **5 piezas** en el
mismo proyecto de Railway: Postgres, Redis, backend (HTTP), backend (worker de
BullMQ) y frontend. El worker es un servicio Railway aparte porque tiene que
correr **siempre**, en paralelo al servidor HTTP, no como parte de él — si
solo desplegaras el servidor HTTP, las citas se crearían y pagarían bien pero
nunca expirarían los holds ni saldrían los recordatorios.

Esta guía asume cuenta en [railway.app](https://railway.app), el repo subido
a GitHub, y que ya tienes tu `sk_test_...` de Stripe (ver conversación previa
sobre cómo conseguirlo).

## 1. Crear el proyecto y las bases

1. Railway → **New Project → Deploy from GitHub repo** → selecciona el repo.
2. **New → Database → Add PostgreSQL**. Expone `DATABASE_URL` automáticamente
   como variable del servicio Postgres.
3. **New → Database → Add Redis**. Expone `REDIS_URL` automáticamente como
   variable del servicio Redis — mismo nombre de variable que usa nuestro
   `env.ts`, no hay que renombrar nada.

## 2. Servicio backend (HTTP)

1. **New → GitHub Repo** (mismo repo) → **Settings**:
   - **Root Directory**: `back`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
2. **Variables**:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `JWT_ACCESS_SECRET` | random largo — `openssl rand -base64 32` |
   | `JWT_REFRESH_SECRET` | otro random largo, distinto al anterior |
   | `FRONTEND_URL` | URL pública del frontend (paso 4) — se agrega **después** de crearlo |
   | `STRIPE_SECRET_KEY` | tu `sk_test_...` (test mode; nunca la `sk_live_...` para este challenge) |
   | `STRIPE_WEBHOOK_SECRET` | el `whsec_...` del endpoint de **producción** (ver paso 3, es distinto al de `stripe listen` local) |
   | `RESEND_API_KEY` | tu API key real de resend.com |
   | `EMAIL_FROM` | remitente verificado en Resend, ej. `citas@tu-dominio.com` |
   | `SENTRY_DSN` | el DSN de tu proyecto en sentry.io (opcional, pero sin esto no se cumple "Sentry recibe errores reales en producción") |
   | `RAILPACK_INSTALL_CMD` | `npm install` — ver nota abajo, obligatoria |

   `HOLD_TTL_MINUTES` y `REMINDER_HOURS_BEFORE` tienen default (15 y 24) — solo
   agrégalas si quieres otro valor.

3. Deploy. Copia el dominio público `algo.up.railway.app` — lo necesitas para
   el endpoint de Stripe (paso 3) y para `VITE_API_URL` del frontend (paso 4).
4. Corre el seed una sola vez (médica + staff + paciente de prueba + servicios
   + disponibilidad):

   ```bash
   railway run --service <nombre-del-servicio-backend> npx prisma db seed
   ```

## 3. Configurar el webhook de Stripe en producción

**No se usa `stripe listen` en producción** — eso es solo para local. Stripe
manda los webhooks directo a tu URL pública:

1. En el [dashboard de Stripe](https://dashboard.stripe.com) (modo test) →
   **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL**: `https://<tu-backend>.up.railway.app/webhooks/stripe`
3. **Eventos a escuchar**: `checkout.session.completed` (es el único que
   procesamos — ver `back/src/services/webhook.service.ts`).
4. Al crear el endpoint, Stripe te muestra un **Signing secret**
   (`whsec_...`) — pégalo en la variable `STRIPE_WEBHOOK_SECRET` del backend
   (paso 2). Es distinto del que te da `stripe listen` en local.

## 4. Servicio backend (worker)

**Mismo código, servicio de Railway separado** — así el worker corre 24/7
independiente del servidor HTTP.

1. **New → GitHub Repo** (mismo repo, otra vez) → **Settings**:
   - **Root Directory**: `back`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:worker`
2. **Variables**: **exactamente las mismas** que el backend HTTP (paso 2) —
   copialas todas, incluido `RAILPACK_INSTALL_CMD=npm install`. El worker usa
   el mismo `env.ts`, así que valida el mismo set completo de variables aunque
   no use todas funcionalmente (ej. no verifica JWT, pero el schema Zod las
   exige igual para arrancar).
3. Deploy. Este servicio no expone dominio público — no le hace falta, no
   recibe requests HTTP, solo procesa jobs de BullMQ contra el mismo Redis.

## 5. Servicio frontend

1. **New → GitHub Repo** (mismo repo) → **Settings**:
   - **Root Directory**: `front`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
2. **Variables**:

   | Variable | Valor |
   | --- | --- |
   | `VITE_API_URL` | URL pública del backend HTTP (paso 2) |
   | `RAILPACK_INSTALL_CMD` | `npm install` |

3. Deploy. Copia la URL pública.
4. Volvé al servicio **backend (HTTP)** y agregá/actualizá `FRONTEND_URL` con
   esta URL exacta, para que CORS deje de aceptar cualquier origen.

## 6. Verificación post-deploy

- `curl https://<backend>.up.railway.app/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"alejo@yopmail.com","password":"Alejo#2026"}'`
  → debe devolver `accessToken` + `refreshToken`.
- Abrir el frontend, loguearte como paciente, agendar una cita real, pagar con
  una [tarjeta de test de Stripe](https://docs.stripe.com/testing#cards)
  (`4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC).
- Confirmar en el dashboard de Stripe (**Developers → Webhooks** → tu
  endpoint → pestaña de intentos) que el evento se entregó con `200`.
- Confirmar en el panel de staff que la cita pasó a `paid` sin que tuvieras
  que tocar nada manualmente — eso es lo que antes arreglábamos a mano en
  local porque el worker no corría.
- Forzar un error real (ej. pegarle a un endpoint con un token corrupto) y
  confirmar que aparece en Sentry.
- HTTPS: Railway lo da automático en dominios `*.up.railway.app`, no hay nada
  que configurar.

## Notas

- Las migraciones corren automáticamente en cada deploy del backend HTTP
  (`prisma migrate deploy` en el Start Command). El worker **no** corre
  migraciones — no hace falta duplicarlo, y evita una carrera si ambos
  servicios se despliegan al mismo tiempo.
- El seed **no** se re-corre automáticamente — es a propósito, para no volver
  a crear los usuarios de prueba en cada deploy. Es un paso manual único.
- `RAILPACK_INSTALL_CMD=npm install` debe estar en **los tres** servicios
  (`back` HTTP, `back` worker, `front`). Railpack corre `npm ci` antes de tu
  Build Command sin que puedas quitarlo desde el dashboard, y con Prisma 7 +
  ESLint eso produce falsos negativos de sincronización de lockfile
  específicos de Linux/npm 10 aunque el lockfile esté bien. Si un build falla
  con `npm error EUSAGE` mencionando paquetes "missing from lock file" que no
  tienen nada que ver con tu código, esta variable es lo primero a revisar.
- Si el worker se cae (crash, redeploy, lo que sea), los holds y recordatorios
  simplemente no se procesan hasta que vuelva a levantar — no se pierden
  citas, solo se atrasa la limpieza/notificación. Railway reinicia servicios
  caídos automáticamente por default.
