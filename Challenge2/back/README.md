# NutriFit — Backend

API REST para el tracker de hábitos NutriFit (Challenge 2). Fastify + TypeScript
estricto + Prisma + PostgreSQL. Ver el diseño completo en
[`../SPEC.md`](../SPEC.md).

## Requisitos

- Node.js 20+
- PostgreSQL 14+ corriendo en algún lado (local, Docker, o managed)

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
   | `DATABASE_URL` | Cadena de conexión Postgres (`postgresql://user:pass@host:5432/db`) |
   | `JWT_ACCESS_SECRET` | Secreto para firmar access tokens |
   | `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens (distinto del anterior) |
   | `PORT` | Puerto del servidor (default `3000`) |

3. Generar el cliente de Prisma y aplicar migraciones:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Poblar datos de prueba (crea la nutrióloga única del sistema + un paciente de
   prueba):

   ```bash
   npx prisma db seed
   ```

   Usuarios creados:

   | Rol | Email | Password |
   | --- | --- | --- |
   | patient | `alejo@yopmail.com` | `Alejo#2026` |
   | nutritionist | `nutri@nutrifit.com` | `NutriFit#2026` |

5. Levantar el servidor en modo desarrollo:

   ```bash
   npm run dev
   ```

   Queda escuchando en `http://localhost:3000`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor con recarga automática (`tsx watch`) |
| `npm run build` | Compila a `dist/` |
| `npm start` | Corre el build de producción (`node dist/server.js`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Regenera el cliente de Prisma tras cambiar el schema |
| `npm run prisma:migrate` | Crea y aplica una nueva migración |

## Estructura

```
src/
  config/env.ts       validación de variables de entorno con Zod
  content/es.json      diccionario centralizado de mensajes (errores, validación)
  lib/                  prisma client, jwt, errores tipados, validador de Zod
  plugins/auth.ts       middleware de autenticación + guard por rol
  schemas/              Zod: auth, habits
  services/             lógica de negocio (sin Fastify de por medio)
  routes/               capa HTTP delgada: parsea, delega al service, responde
  app.ts / server.ts    build de Fastify + entrypoint
prisma/
  schema.prisma
  seed.ts
```

## Decisiones documentadas

Ver `../docs/adr/` para el porqué de: la política de contraseñas, la estrategia
de auth (JWT + refresh) y el cambio de configuración de conexión en Prisma 7.
