# ADR-005: Conexión a Postgres vía driver adapter (Prisma 7)

**Fecha:** 2026-07-25
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

Al correr `prisma generate` con la versión instalada (Prisma 7.9.0), falló con:
`The datasource property 'url' is no longer supported in schema files`. Prisma 7
eliminó el motor en Rust por default y cambió cómo `PrismaClient` se conecta a la
base de datos — esto no fue una elección nuestra, fue una migración forzada por
la versión del paquete al momento de instalar.

## Opciones consideradas

1. **Fijar una versión anterior de Prisma (6.x)** que siguiera aceptando `url`
   directo en el `datasource` del schema.
   - Pros: cero cambios de código.
   - Contras: usar una versión vieja a propósito el primer día del proyecto no
     tiene sentido — se pierde soporte y mejoras futuras sin ninguna ganancia
     real.
2. **Adoptar el driver adapter** (`@prisma/adapter-pg`) que pide Prisma 7 —
   elegida.
   - Pros: es el camino soportado hacia adelante; el resto del stack (Fastify,
     Zod, etc.) no se ve afectado.
   - Contras: requiere `prisma.config.ts` (nuevo archivo de configuración) y
     construir `PrismaClient` con el adapter explícito en vez de dejar que lea
     `DATABASE_URL` del schema directamente.

## Decisión

Se instaló `@prisma/adapter-pg` y `dotenv`. `prisma/schema.prisma` ya no declara
`url` en el `datasource` (solo `provider = "postgresql"`). La URL de conexión
vive en `prisma.config.ts` (para el CLI: `migrate`, `db seed`) y se pasa
explícitamente al construir el cliente en `back/src/lib/prisma.ts`:

```ts
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

## Consecuencias

- **Positivas:** el proyecto queda alineado con la versión estable actual de
  Prisma, sin deuda técnica de día uno.
- **Negativas / tradeoffs:** un archivo de configuración más
  (`prisma.config.ts`) que no existía en versiones anteriores de Prisma —
  cualquiera que busque tutoriales viejos de Prisma se puede confundir con la
  sintaxis anterior.
- **Cosas a monitorear:** si Prisma vuelve a cambiar su API de conexión en una
  major futura, revisar este archivo primero.

## Referencias

- https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/no-rust-engine
- `back/prisma.config.ts`, `back/src/lib/prisma.ts`, `back/prisma/schema.prisma`
