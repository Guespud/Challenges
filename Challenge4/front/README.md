# Vitalis Clinic — Frontend

App web (React + TypeScript + Vite + TailwindCSS) de la plataforma de
reserva de citas Vitalis Clinic (Challenge 3). Ver el diseño completo en
[`../SPEC.md`](../SPEC.md).

## Requisitos

- Node.js 20+
- El backend corriendo (ver [`../back/README.md`](../back/README.md))

## Setup local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.local.example` a `.env.local` y ajustar si el backend no corre en
   el puerto default:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Descripción |
   | --- | --- |
   | `VITE_API_URL` | URL base del backend (default `http://localhost:3000`) |

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Queda en `http://localhost:5173`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | `tsc -b && vite build` — build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | ESLint |

## Estructura

Organización **feature-first** (no por capa técnica) — ver ADR-003:

```
src/
  app/                    rutas + layouts por rol (paciente/staff/médico); solo
                           importa desde features/*/index.ts
  core/                    infraestructura transversal real: cliente API + hook
                           useApi + auth-storage + helper de redirect por rol
  components/              UI compartida por 2+ features (Button, Card, StatusBadge, TopNav…)
  content/es.json           diccionario centralizado de textos y mensajes
  types/                    tipos cruzados entre features
  features/
    auth/         data/ (schemas + endpoints) · shared/ (auth-context) · ui/ · index.ts
    doctors/       data/ (catálogo + disponibilidad) · index.ts
    booking/       ui/ (wizard médico → servicio → horario → checkout) · index.ts
    appointments/  data/ · ui/ ("Mis citas" del paciente + retorno de Stripe) · index.ts
    admin/         data/ · ui/ (panel de staff, log de eventos) · index.ts
    agenda/        ui/ (agenda de solo lectura del médico) · index.ts
```

Regla dura: nada fuera de una feature importa de sus archivos internos — solo de
su `index.ts`.

## Decisiones documentadas

Ver `../docs/adr/` — en particular la estructura de carpetas (ADR-003) y la
política de contraseñas compartida con el backend (ADR-001).
