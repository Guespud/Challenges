# ADR-006: `RAILPACK_INSTALL_CMD=npm install` en vez del `npm ci` por defecto

**Fecha:** 2026-07-26
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

El deploy en Railway fallaba en el paso de build con errores tipo
`npm error EUSAGE ... Missing: react@19.2.8 from lock file` — en el
**backend**, un proyecto Fastify que ni siquiera tiene React como
dependencia. El mismo patrón apareció en el frontend con `ajv@6` vs `ajv@8`.

Investigación (reproducida en Docker `linux/amd64`, la misma plataforma que
usa Railway, no solo en macOS local):

- `@prisma/studio-core` (que Prisma 7 arrastra internamente para el comando
  `prisma studio`) exige `react`/`react-dom` como **peer dependency real**
  (no opcional). `npm install` resuelve esto sin problema.
- Railpack (el builder de Railway) corre su propio paso de **"install"**
  hardcodeado (`npm ci`) **antes** de nuestro Build Command — no hay campo en
  el dashboard para cambiarlo.
- `npm ci` valida que el lockfile case *exacto* con el árbol ideal de
  dependencias. En npm 10.9.8 (el que trae el Node de Railway) esta
  validación falla de forma no determinista específicamente cuando hay
  peer dependencies reales que apuntan a paquetes con múltiples versiones
  mayores necesarias a la vez (el caso de `ajv@6` vs `ajv@8` en el frontend).
- Confirmado: un `npm install` recién hecho, seguido de `npm ci` en la
  **misma sesión de Linux**, ya fallaba — no era un problema de nuestro
  lockfile estar "desincronizado", era `npm ci` rechazando un árbol que
  `npm install` acababa de generar correctamente.

## Opciones consideradas

1. **Seguir regenerando el lockfile una y otra vez.** Fue lo primero que
   intentamos (varias veces). No funciona: el árbol de dependencias en
   cuestión es válido, el problema es la validación estricta de `npm ci`
   frente a esta combinación específica de peer dependencies, no el
   contenido del lockfile.
2. **Fijar versiones exactas con `overrides`** (`react`/`react-dom` en el
   backend; `ajv` con overrides anidados por paquete en el frontend).
   Funcionó para el backend (una sola versión real necesaria). Para el
   frontend, forzar una sola versión de `ajv` global rompe ESLint en tiempo
   de ejecución (`Cannot find module 'ajv/lib/refs/json-schema-draft-04.json'`
   — ESLint depende de una API interna de `ajv@6` que no existe en `ajv@8`).
   Los overrides anidados para mantener ambas versiones coexistiendo
   resultaron frágiles y no convergían de forma estable.
3. **Anular el paso de `npm ci` de Railpack con `RAILPACK_INSTALL_CMD=npm install`**
   — elegida. Es una variable de entorno documentada por Railway/Railpack
   para exactamente este propósito.

## Decisión

Se agrega `RAILPACK_INSTALL_CMD=npm install` como variable de entorno en
**ambos** servicios de Railway (backend y frontend). Esto reemplaza el
`npm ci` interno de Railpack por `npm install`, que no tiene la validación
estricta de sincronización y nunca falló en ninguna de nuestras pruebas
(macOS, Linux/amd64 vía Docker, con o sin `NODE_ENV=production`).

Se mantiene el `overrides` de `react`/`react-dom` en `back/package.json`
(fijados a una versión exacta) porque no tiene efectos negativos y añade
determinismo real sin costo. Se **revirtió** el intento de overrides de
`ajv` en el frontend por ser innecesario ahora y por el riesgo de romper
`eslint` silenciosamente.

## Consecuencias

- **Positivas:** el build ya no depende de que `npm ci` acierte con un caso
  límite de resolución de peer dependencies que no controlamos (viene de
  Prisma y de ESLint, no de nuestro código).
- **Negativas / tradeoffs:** `npm install` es marginalmente más lento y menos
  estricto que `npm ci` (no valida que el lockfile esté 100% al día antes de
  instalar) — aceptable para este proyecto; si se quisiera esa garantía de
  vuelta, se podría correr `npm ci` como parte del pipeline de CI (que sí
  corre en un entorno que ya verificamos que funciona) sin que bloquee el
  deploy.
- **Cosas a monitorear:** si Railway cambia cómo expone `RAILPACK_INSTALL_CMD`
  o si una futura versión de Railpack agrega un campo de "Install Command"
  explícito en el dashboard, esta variable de entorno se puede reemplazar
  por esa opción nativa.

## Referencias

- https://railpack.com/config/file/
- https://station.railway.com/questions/custom-npm-install-command-31cb8960
- `back/package.json` (`overrides`), `docs/deploy-railway.md`
