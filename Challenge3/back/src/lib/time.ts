/**
 * Los horarios de citas se guardan como si la hora local del servidor fuera
 * UTC (ej. el schedule "16:30" del médico se persiste literal como
 * `...T16:30:00.000Z`, sin conversión real de timezone — mismo patrón que
 * ADR-002 en Challenge2). El front los muestra igual, extrayendo la hora con
 * `timeZone: 'UTC'` sin convertir.
 *
 * Por eso cualquier comparación contra "ahora" tiene que usar esta misma
 * convención y no `Date.now()` real: comparar un `startsAt` "falso UTC" (hora
 * local disfrazada) contra la hora UTC real desalinea el resultado por el
 * offset de zona horaria del servidor.
 */
export function nowLikeStored(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    ),
  );
}
