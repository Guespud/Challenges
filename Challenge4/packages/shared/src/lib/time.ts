/**
 * Los horarios de citas se guardan como si la hora de pared de la clínica
 * fuera UTC (ej. el schedule "16:30" del médico se persiste literal como
 * `...T16:30:00.000Z`, sin conversión real de timezone — mismo patrón que
 * ADR-002 en Challenge2). El front los muestra igual, extrayendo la hora con
 * `timeZone: 'UTC'` sin convertir.
 *
 * La zona horaria de la clínica está fija acá, en el código — NO se deriva
 * del reloj/timezone del sistema operativo del servidor. Antes esta función
 * usaba `now.getHours()` (hora local del proceso), lo que funcionaba en
 * local (el desarrollador estaba en la misma zona que la clínica) pero se
 * rompía en producción apenas el servidor corría en otra zona (ej. los
 * contenedores de Railway, que son UTC por defecto): "ahora" quedaba
 * desalineado de la disponibilidad sembrada por el offset completo entre
 * UTC y la clínica. Un paciente consultando desde cualquier país (México,
 * Colombia, donde sea) siempre tiene que ver la misma disponibilidad: la
 * médica atiende 9am-5pm hora de Colombia sin importar quién pregunta.
 *
 * Por eso cualquier comparación contra "ahora" tiene que usar esta misma
 * convención y no `Date.now()` real: comparar un `startsAt` "falso UTC" (hora
 * de la clínica disfrazada) contra la hora UTC real desalinea el resultado.
 * Compartido porque Appointments y Notifications (recordatorios) ambos lo
 * necesitan.
 */
const CLINIC_TIMEZONE = 'America/Bogota';

const clinicWallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getClinicWallClockParts(instant: Date) {
  const parts = clinicWallClockFormatter.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function nowLikeStored(): Date {
  const p = getClinicWallClockParts(new Date());
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0));
}
