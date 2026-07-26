# ADR-003: Estructura de carpetas del frontend (feature-first)

**Fecha:** 2026-07-25
**Estado:** Aceptado
**Decisor(es):** Alejo

## Contexto

El frontend arrancó organizado por capa técnica (`lib/`, `hooks/`, `components/`,
`pages/`, `schemas/`) — la forma más común de empezar un proyecto React chico.
Con 3 dominios reales (auth, hábitos, pacientes) y ~15 archivos, valía la pena
decidir esto antes de que creciera más y la refactorización doliera más.

## Opciones consideradas

1. **Por capa técnica** (la que había): `components/`, `hooks/`, `pages/` a nivel
   raíz, cada uno acumulando archivos de todos los dominios sin distinción.
   - Pros: es la que ya existía, cero costo de migración.
   - Contras: nada impide que cualquier página importe directo de cualquier
     hook/schema de cualquier otro dominio — no hay límites. Investigado contra
     tres fuentes (developerway, bulletproof-react, Feature-Sliced Design): las
     tres coinciden en que esto no escala.
2. **Feature-Sliced Design (FSD) completo**: 6 capas fijas
   (`app→pages→widgets→features→entities→shared`) con regla de dependencia
   unidireccional estricta.
   - Pros: el más riguroso, con reglas verificables por herramientas de lint.
   - Contras: ceremonia alta para 3 dominios chicos — va contra la filosofía del
     propio programa de no diseñar para un futuro hipotético.
3. **Feature-first estilo bulletproof-react** — elegida. Carpeta por dominio
   (`features/{auth,habits,patients}`), cada una con `data/` + `ui/` +
   `index.ts` como única API pública; lo compartido de verdad vive en `core/` y
   `components/` de nivel raíz.
   - Pros: resuelve el problema real (límites claros entre dominios) sin la
     ceremonia de FSD. Escala razonablemente hasta que haya ~10+ features
     (momento en el que se podría agrupar en `domains/`, per Robin Wieruch).
   - Contras: ninguno relevante a esta escala.

## Decisión

Feature-first (opción 3). Cada feature expone su API pública solo vía
`index.ts`; nadie fuera de la feature importa de sus archivos internos. Lo
compartido por 2+ features se promueve a `core/` (infraestructura) o
`components/` (UI) — nunca antes de que 2 features lo necesiten de verdad (ej.
`HabitChart` se promovió a `components/` porque lo usan tanto `habits` como
`patients`).

## Consecuencias

- **Positivas:** un cambio interno a una feature (ej. cómo se llama el
  endpoint, qué campos tiene el form) no puede romper otra feature por
  accidente, porque la única superficie de contacto es el `index.ts`.
- **Negativas / tradeoffs:** un poco más de indirección para encontrar un
  archivo la primera vez (hay que saber en qué feature vive).
- **Cosas a monitorear:** si el número de features pasa de ~10, revisar si
  conviene agrupar en `domains/` (ej. `domains/clinica/{auth,habits,patients}`).

## Referencias

- [developerway.com — React project structure](https://www.developerway.com/posts/react-project-structure)
- [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Robin Wieruch — React Folder Structure](https://www.robinwieruch.de/react-folder-structure/)
