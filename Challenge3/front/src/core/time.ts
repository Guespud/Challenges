/**
 * Los horarios de citas se guardan como si la hora local del navegador/servidor
 * fuera UTC (ej. "4:30 p.m." local se persiste literal como
 * `...T16:30:00.000Z`, sin conversión real de timezone). Por eso cualquier
 * comparación contra "ahora" tiene que usar esta misma convención y no
 * `Date.now()` real: comparar un `startsAt` "falso UTC" (hora local
 * disfrazada) contra la hora UTC real desalinea el resultado por el offset de
 * zona horaria del dispositivo.
 */
export function nowLikeStored(): number {
  const now = new Date();
  return Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
}
