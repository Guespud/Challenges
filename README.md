# Challenges

Este repo tiene tres proyectos, cada uno en su propia carpeta.

## Challenge1 — `nota`

CLI local para gestionar notas personales con etiquetas y búsqueda. Sin
servidor, sin base de datos remota — todo en un archivo SQLite local.
Detalle completo en [Challenge1/README.md](Challenge1/README.md).

Para probarlo:

```bash
cd Challenge1
npm install
npx tsx src/cli.ts add "Comprar leche" --tag hogar
npx tsx src/cli.ts list
```

No tiene usuarios ni login — es una herramienta de línea de comandos.

## Challenge2 — NutriFit

Tracker de hábitos diarios (agua, ejercicio, sueño) con dos roles: paciente
y nutrióloga. Backend Fastify + Prisma + Postgres, frontend React + Vite.
Detalle completo en [Challenge2/README.md](Challenge2/README.md).

En producción: https://challenges-production.up.railway.app

Usuarios de prueba:

| Rol | Email | Password |
| --- | --- | --- |
| patient | `alejo@yopmail.com` | `Alejo#2026` |
| nutritionist | `nutri@nutrifit.com` | `NutriFit#2026` |

## Challenge3 — Vitalis Clinic

Plataforma de reserva de citas médicas con cobro en línea (Stripe),
notificaciones por email, recordatorios y cancelaciones automatizadas, y un
panel administrativo para el staff. Backend Fastify + Prisma + Postgres +
BullMQ + Redis, frontend React + Vite. Detalle completo en
[Challenge3/README.md](Challenge3/README.md).

En producción: https://challenges-production-bd6a.up.railway.app

Usuarios de prueba:

| Rol | Email | Password | Qué ve |
| --- | --- | --- | --- |
| patient | `alejo@yopmail.com` | `Alejo#2026` | Agendar / Mis citas |
| doctor | `doctora@vitalis-clinic.test` | `Vitalis#2026` | Mi agenda (solo lectura) |
| staff | `staff@vitalis-clinic.test` | `Vitalis#2026` | Panel de citas (staff) |
