# SPEC — NutriFit (Challenge 2: "El primer producto")

> Este documento describe el sistema tal como está construido. Se redactó de forma
> retroactiva (el diseño real se acordó en conversación antes de codear cada pieza,
> pero nunca se guardó como archivo versionado) — a partir de aquí, todo cambio de
> comportamiento debe actualizar este archivo primero.

## Objetivo

Aplicación web full-stack para que pacientes de una nutrióloga registren hábitos
diarios (agua, ejercicio, sueño), y la nutrióloga vea el progreso de todos sus
pacientes. Dos roles, aislamiento estricto de datos entre pacientes.

## Stack

- **Backend**: Fastify + TypeScript estricto + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Validación**: Zod en cada endpoint (back) y en cada formulario (front), con las
  mismas reglas de negocio duplicadas a propósito (son repos separados, sin
  workspace compartido)
- **Auth**: JWT (access 15 min) + refresh token (7 días)
- **Formularios**: react-hook-form + `@hookform/resolvers/zod`

## Modelo de datos

### User

| Campo         | Tipo     | Notas                              |
| ------------- | -------- | ----------------------------------- |
| id            | uuid     | PK                                  |
| email         | string   | único                               |
| password_hash | string   | bcrypt, 10 rounds                   |
| role          | enum     | `patient` \| `nutritionist`         |
| name          | string   |                                      |
| created_at    | datetime |                                      |

### HabitEntry

| Campo         | Tipo     | Notas                                        |
| ------------- | -------- | --------------------------------------------- |
| id            | uuid     | PK                                            |
| patient_id    | uuid     | FK → User                                     |
| date          | date     | único por `(patient_id, date)`                |
| water_ml      | int      | >= 0                                          |
| exercise_min  | int      | >= 0                                          |
| sleep_hours   | float    | 0–24                                          |
| created_at    | datetime |                                                |

Diagrama entidad-relación: ver [`docs/db-schema.md`](docs/db-schema.md).

**Regla de asignación paciente↔nutrióloga**: no existe relación explícita. Hay una
sola nutrióloga en el sistema (creada por seed, no por registro público). Cualquier
usuario con `role: patient` es, por definición, su paciente.

**Regla de un registro por día**: la BD fuerza único `(patient_id, date)`. El
backend hace `upsert` (si ya existe, actualiza en vez de duplicar). El **frontend**
además oculta el formulario y muestra un resumen de solo lectura si el paciente ya
registró hoy — ver "Inconsistencia conocida" más abajo.

## Política de contraseña

Aplicada con las mismas reglas en front (Zod) y back (Zod), y recortando
espacios/tabs accidentales (`.trim()`) antes de validar:

- Mínimo 8 caracteres
- Al menos una mayúscula, una minúscula, un número y un carácter especial

## Endpoints

### `POST /auth/register`
Body: `{ email, password, name }`. Crea `role: patient` (fijo). 201 con el usuario
(sin password_hash). 422 si el email ya existe. 400 si el body no cumple Zod.

### `POST /auth/login`
Body: `{ email, password }`. 200 → `{ accessToken, refreshToken }`. 401 con mensaje
genérico "Credenciales inválidas" si el email no existe o el password no coincide.

### `POST /auth/refresh`
Body: `{ refreshToken }`. 200 → `{ accessToken }`. 401 si el refresh token es
inválido o expiró.

### `GET /me`
Requiere JWT. 200 → `{ id, email, name, role }`. 401 si no hay token válido.

### `POST /habits`
Requiere JWT + `role: patient`. Body: `{ date, water_ml, exercise_min, sleep_hours }`.
`patient_id` sale del JWT, nunca del body. Upsert por `(patient_id, date)`: 201 si
crea, 200 si actualiza. 403 si el rol es `nutritionist`. 422 si los valores no
pasan la validación de negocio.

### `GET /habits/me?days=30`
Requiere JWT + `role: patient`. 200 → arreglo de `HabitEntry`, ascendente por fecha.

### `GET /patients`
Requiere JWT + `role: nutritionist`. 200 → `{ id, name, email, created_at }[]`.
403 si el rol es `patient`.

### `GET /patients/:id/habits?days=30`
Requiere JWT + `role: nutritionist`. 200 → historial del paciente `:id`. 404 si
`:id` no es un paciente existente. 403 si el rol es `patient`.

## Manejo de errores HTTP

| Código | Cuándo |
| --- | --- |
| 400 | Body malformado / no cumple el schema Zod |
| 401 | No autenticado: falta el header o el token es inválido/expiró |
| 403 | Autenticado pero el rol no tiene permiso sobre el recurso |
| 404 | El recurso solicitado no existe |
| 422 | Bien formado pero viola una regla de negocio (email duplicado, password débil, etc.) |

Formato uniforme: `{ error: string, statusCode: number }`. Nunca se expone un stack
trace. Los mensajes viven en `src/content/es.json` (back) y `src/content/es.json`
(front) — un diccionario centralizado, no strings sueltos en el código.

## Frontend — pantallas

1. **Login / Registro** — mobile-first, con confirmación de contraseña y checklist
   de requisitos en vivo (registro), ojito para mostrar/ocultar password.
2. **Vista paciente**: si no ha registrado hoy, formulario de hábitos; si ya
   registró, un resumen de solo lectura ("Registrado hoy"). Debajo, historial de
   30 días como *small multiples* (una mini-gráfica por métrica — agua, ejercicio
   y sueño tienen escalas incompatibles para compartir un solo eje).
3. **Vista nutrióloga**: lista de pacientes → detalle con el mismo chart +
   una tabla de registros (fecha, agua, ejercicio, sueño, más reciente primero).

El JWT se guarda en `localStorage`. Si el access token vence (401), el cliente
intenta `/auth/refresh` una vez antes de forzar logout.

## Estructura de proyecto (frontend)

Feature-first (no por capa técnica): `features/{auth,habits,patients}` cada una
con `data/` (schemas + llamadas HTTP), `ui/` y un `index.ts` como única API
pública. Lo compartido de verdad (por 2+ features) vive en `core/` y
`components/`. Ver ADR-003.

## Inconsistencia conocida (pendiente de decisión)

El SPEC original definía "upsert" para el mismo día (permitir corregir el
registro). Después se pidió bloquear el re-registro desde la UI una vez ya
registrado hoy. Lo que existe hoy:

- **Frontend**: oculta el formulario si ya hay entrada de hoy → en la práctica,
  un usuario normal no puede volver a enviar.
- **Backend**: sigue aceptando un `POST /habits` para el mismo día vía llamada
  directa a la API (curl, Postman, etc.) y lo trata como actualización.

No se decidió todavía si el backend debe rechazar (409/422) un segundo intento
para el mismo día, o si el upsert por API directa es un comportamiento aceptado
(ej. para que la nutrióloga o un admin puedan corregir un dato a futuro). **Pendiente
de decisión de producto.**

## Fuera de alcance para esta entrega

- Notificaciones por email, exportar PDF, modo offline/sync (stretch goals).
- Rotación avanzada de refresh tokens (blacklist, family tracking).
- Deploy en producción: repo preparado (scripts, CORS configurable, guía en
  [`docs/deploy-railway.md`](docs/deploy-railway.md)), pero **no ejecutado
  todavía** — requiere login interactivo del usuario en Railway.
