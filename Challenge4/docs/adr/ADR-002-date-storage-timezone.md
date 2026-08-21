# ADR-002: Almacenamiento de fecha del hábito y su límite de timezone

**Fecha:** 2026-07-25
**Estado:** Aceptado (con limitación conocida)
**Decisor(es):** Alejo

## Contexto

Un `HabitEntry` pertenece a un día calendario ("hoy"), no a un instante preciso.
Hay que decidir cómo se guarda ese "día" y qué pasa cuando el paciente está en un
timezone distinto al del servidor.

## Opciones consideradas

1. **Guardar el timestamp exacto del momento de registro** (`DateTime` completo).
   - Pros: no se pierde información.
   - Contras: comparar "¿ya registró hoy?" se vuelve ambiguo — ¿hoy según qué
     timezone? Rompe el índice único simple por día.
2. **Guardar el día como `@db.Date`, normalizado a medianoche UTC** — elegida.
   - Pros: comparación de "un registro por día" trivial (`@@unique([patientId, date])`),
     el cliente solo manda `YYYY-MM-DD`.
   - Contras: "medianoche UTC" no es "medianoche" para un paciente que no está en
     UTC+0 — ver limitación abajo.
3. **Guardar el timezone del usuario junto con la fecha.**
   - Pros: resolvería la ambigüedad correctamente.
   - Contras: complejidad no justificada para un tracker de hábitos personal; el
     SPEC no pide soporte multi-timezone.

## Decisión

`date` se guarda como `@db.Date`, y el backend la normaliza a medianoche UTC
(`toUtcDate()` en `back/src/services/habit.service.ts`). El frontend calcula
"hoy" con `new Date().toISOString().slice(0, 10)` — también UTC.

## Consecuencias

- **Positivas:** la lógica de "un registro por día" y "¿ya registré hoy?" es
  simple y consistente entre frontend y backend porque ambos hablan en UTC.
- **Negativas / tradeoffs (limitación conocida):** para un paciente en un
  timezone muy distinto a UTC (ej. UTC-6 México, o UTC+9 Japón), "medianoche
  UTC" no coincide con su medianoche local. Un paciente que registra a las 11pm
  hora local cerca del cambio de día puede ver el registro asignado al día
  "equivocado" desde su perspectiva.
  - Esto **ya causó un bug real** durante el desarrollo: el *formateo* de fecha
    en el chart y la tabla (`toLocaleDateString` sin `timeZone: 'UTC'`) mostraba
    el día corrido -1 en timezones negativos. Se corrigió forzando
    `timeZone: 'UTC'` en el formateo (no en el almacenamiento, que ya era
    correcto) — commit relacionado en frontend, `HabitChart.tsx` y
    `HabitEntriesTable.tsx`.
- **Cosas a monitorear:** si el producto necesita soporte real multi-timezone,
  esto requiere guardar el timezone del paciente (o su offset al momento del
  registro) y recalcular "el día" contra ese offset, no contra UTC fijo.

## Referencias

- `back/src/services/habit.service.ts` (`toUtcDate`)
- `front/src/features/habits/data/today.ts`
