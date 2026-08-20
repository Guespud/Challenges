# NutriFit — Challenge 2: "El primer producto"

Tracker de hábitos diarios para pacientes de una nutrióloga, con dos roles
(paciente / nutrióloga) y aislamiento estricto de datos entre pacientes.

- **Diseño completo**: [`SPEC.md`](SPEC.md)
- **Diagrama de base de datos**: [`docs/db-schema.md`](docs/db-schema.md)
- **Decisiones arquitectónicas**: [`docs/adr/`](docs/adr/)
- **Backend**: [`back/README.md`](back/README.md) — Fastify + TypeScript + Prisma + PostgreSQL
- **Frontend**: [`front/README.md`](front/README.md) — React + TypeScript + Vite + TailwindCSS

## Quickstart

```bash
# 1. Postgres corriendo en localhost:5432 (Docker, local, o managed)

# 2. Backend
cd back
npm install
cp .env.example .env   # editar DATABASE_URL si aplica
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev             # http://localhost:3000

# 3. Frontend (en otra terminal)
cd front
npm install
cp .env.local.example .env.local
npm run dev             # http://localhost:5173
```

Usuarios de prueba (creados por el seed):

| Rol | Email | Password |
| --- | --- | --- |
| patient | `alejo@yopmail.com` | `Alejo#2026` |
| nutritionist | `nutri@nutrifit.com` | `NutriFit#2026` |

## Deploy

Guía paso a paso para Railway (backend + Postgres + frontend):
[`docs/deploy-railway.md`](docs/deploy-railway.md). Requiere cuenta propia en
Railway — el login es interactivo por navegador, no se puede automatizar.

En producción: https://challenges-production.up.railway.app/login

## Estado del challenge

Ver la sección "Inconsistencia conocida" en [`SPEC.md`](SPEC.md) para el único
comportamiento pendiente de decisión de producto.
