# ADR-001: Estrategia de autenticación y modelo de permisos

**Fecha:** 2026-07-25
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

Necesitamos que pacientes y nutrióloga inicien sesión desde un SPA (React) contra
una API stateless (Fastify), sin sesiones de servidor, y que cada endpoint sepa
tanto *quién* llama (autenticación) como *qué puede hacer* (autorización por rol).
El SPEC exige aislamiento estricto: un paciente jamás debe poder leer datos de
otro paciente ni acceder a rutas de la nutrióloga.

## Opciones consideradas

1. **JWT sin refresh, expiración larga (ej. 7 días)**
   - Pros: simple, un solo token.
   - Contras: si el token se filtra, queda válido por días. Revocar antes de
     expirar requiere una blacklist server-side, lo que rompe el "stateless".
2. **Sesiones server-side (cookie + store en Redis/Postgres)**
   - Pros: revocación inmediata, estándar y probado.
   - Contras: agrega estado al servidor (contradice la simplicidad buscada para
     este challenge) y una pieza de infraestructura extra (Redis) que este nivel
     del programa no pide todavía (llega en el Challenge 3).
3. **JWT de acceso corto (15 min) + refresh token (7 días)** — elegida.
   - Pros: el access token vive poco (ventana de exposición chica si se filtra),
     el refresh permite sesiones largas sin pedir contraseña de nuevo, sigue
     siendo stateless (no hay tabla de sesiones).
   - Contras: no hay revocación inmediata de un refresh token robado antes de que
     expire (mitigable con blacklist a futuro — ver "Cosas a monitorear").

## Decisión

JWT de acceso (15 min) + refresh token (7 días), ambos firmados con secretos
**distintos** (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`) para que comprometer
uno no comprometa el otro. El modelo de permisos es RBAC simple por rol
(`patient` | `nutritionist`), sin permisos granulares — cada endpoint declara con
qué rol se puede llamar vía el middleware `requireRole(role)`
(`back/src/plugins/auth.ts`). No hay tabla de roles/permisos separada: el rol vive
directo en `User.role` y en el payload del JWT.

El frontend guarda ambos tokens en `localStorage` (ver ADR pendiente si se
decide migrar a httpOnly cookies) y reintenta `/auth/refresh` automáticamente una
vez si un request devuelve 401, antes de forzar logout.

## Consecuencias

- **Positivas:** sin estado de sesión en el servidor; ventana de exposición del
  access token acotada a 15 minutos; el modelo de rol es trivial de razonar y
  extender (agregar un tercer rol es un enum + los `requireRole` que lo usen).
- **Negativas / tradeoffs:** un refresh token robado sigue siendo válido hasta
  que expira (7 días) — no hay revocación server-side. Guardar tokens en
  `localStorage` (no httpOnly cookies) los expone a XSS si algún día se
  introduce una vulnerabilidad de inyección de scripts.
- **Cosas a monitorear:** si el producto crece a necesitar revocación inmediata
  (ej. "cerrar sesión en todos los dispositivos"), habrá que introducir una
  blacklist de refresh tokens (Redis) — eso ya es parte natural del Challenge 3.

## Referencias

- `back/src/lib/jwt.ts`, `back/src/plugins/auth.ts`
- `front/src/features/auth/shared/auth-context.tsx`, `front/src/core/api.ts`
