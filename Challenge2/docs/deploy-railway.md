# Deploy a producción — Railway

Railway no necesita archivos de configuración especiales en el repo para este
caso (monorepo con dos apps) — todo se configura en el dashboard con "Root
Directory" por servicio. Esta guía asume que ya tienes cuenta en
[railway.app](https://railway.app) y el repo subido a GitHub.

## 1. Crear el proyecto y la base de datos

1. En Railway, **New Project → Deploy from GitHub repo** → selecciona este repo.
2. Dentro del proyecto: **New → Database → Add PostgreSQL**. Railway la
   provisiona y expone `DATABASE_URL` automáticamente como variable del
   servicio Postgres — la referenciamos desde el backend en el paso 2.

## 2. Servicio backend

1. **New → GitHub Repo** (mismo repo) → en **Settings**:
   - **Root Directory**: `back`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
2. **Variables** (tab Variables del servicio):

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al servicio Postgres del paso 1) |
   | `JWT_ACCESS_SECRET` | un valor random largo, distinto al de abajo |
   | `JWT_REFRESH_SECRET` | otro valor random largo |
   | `FRONTEND_URL` | la URL pública del servicio frontend (paso 3) — se agrega **después** de crear el frontend, para restringir CORS |
   | `RAILPACK_INSTALL_CMD` | `npm install` — ver nota abajo, es obligatoria |

   Genera secretos random con: `openssl rand -base64 32`

   **Por qué `RAILPACK_INSTALL_CMD=npm install` es obligatoria**: Railpack
   corre su propio paso de "install" con `npm ci` **antes** de tu Build
   Command, sin que puedas quitarlo desde el dashboard. `npm ci` exige que el
   lockfile case exacto con el árbol de dependencias, y con Prisma 7 (que
   arrastra `@prisma/studio-core`, el cual exige `react` como peer dependency
   real) esto produce falsos negativos de sincronización específicos de
   Linux/npm 10, aunque el lockfile esté perfectamente bien. `npm install` no
   tiene esa validación estricta y siempre funciona. Sin esta variable, el
   build falla en el paso de install con un error tipo
   `Missing: react@... from lock file` — no es un problema del código, es
   este paso oculto de Railpack.

3. Deploy. Railway asigna un dominio público `algo.up.railway.app` — cópialo,
   lo necesitas para el `VITE_API_URL` del frontend.
4. Corre el seed una sola vez (crea la nutrióloga única + el paciente de
   prueba). Desde tu máquina, con el CLI de Railway ya logueado y linkeado al
   proyecto:

   ```bash
   railway run --service <nombre-del-servicio-backend> npx prisma db seed
   ```

## 3. Servicio frontend

1. **New → GitHub Repo** (mismo repo) → en **Settings**:
   - **Root Directory**: `front`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` (usa `vite preview`, ya configurado para
     leer `$PORT` y aceptar el dominio dinámico de Railway — ver
     `front/vite.config.ts`)
2. **Variables**:

   | Variable | Valor |
   | --- | --- |
   | `VITE_API_URL` | la URL pública del backend del paso 2 |
   | `RAILPACK_INSTALL_CMD` | `npm install` — mismo motivo que en el backend (ver paso 2); aquí el conflicto real es `ajv@6` de ESLint contra `ajv@8` de `@hookform/resolvers` |

3. Deploy. Copia la URL pública que asigna Railway.
4. Vuelve al servicio **backend** y agrega/actualiza `FRONTEND_URL` con esta
   URL exacta, para que CORS deje de aceptar cualquier origen.

## 4. Verificación post-deploy

- `curl https://<backend>.up.railway.app/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"alejo@yopmail.com","password":"Alejo#2026"}'`
  → debe devolver `accessToken` + `refreshToken`.
- Abrir la URL del frontend, hacer login con ese mismo usuario, confirmar que
  el dashboard carga datos reales.
- Confirmar HTTPS: Railway lo da por default en sus dominios `*.up.railway.app`
  (certificado automático) — no hay configuración manual que hacer para eso.

## Notas

- Las migraciones corren automáticamente en cada deploy (`prisma migrate
  deploy` como parte del Start Command) — no hace falta correrlas a mano salvo
  la primera vez si prefieres separarlo del arranque.
- El seed **no** se re-corre automáticamente (a propósito: no queremos crear la
  nutrióloga de nuevo en cada deploy). Es un paso manual único.
- `RAILPACK_INSTALL_CMD=npm install` debe estar en **ambos** servicios. Si un
  build falla con `npm error EUSAGE` mencionando paquetes "missing from lock
  file" que no tienen nada que ver con el proyecto (ej. `react` en el
  backend), esta variable es lo primero a revisar — ver detalle en el paso 2.
