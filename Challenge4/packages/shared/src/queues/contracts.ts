/**
 * Colas BullMQ que cruzan la frontera de servicio: Appointments produce,
 * Notifications consume. Usan BullMQ (no Redis Streams) porque `reminders`
 * necesita delay programado, algo que Streams no da nativo. `hold-expiry` NO
 * está acá: es 100% interno de Appointments, nadie más lo toca.
 *
 * El payload va denormalizado (trae patientEmail/doctorName/serviceName
 * directo) para que Notifications pueda armar el email sin tener que
 * consultar la base de Appointments ni de Auth.
 */
export const CROSS_SERVICE_QUEUES = {
  notifications: 'notifications',
  reminders: 'reminders',
} as const;

/** Ver ADR-008 (heredado del monolito): retry acotado con backoff exponencial. */
export const EMAIL_RETRY_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 60_000 },
  removeOnComplete: { age: 86_400 },
  removeOnFail: false,
};

export interface EmailJobData {
  appointmentId: string;
  requestId: string;
  patientEmail: string;
  doctorName: string;
  serviceName: string;
  /** ISO string — ver lib/time.ts, es la hora "falso UTC" tal como se guarda. */
  startsAt: string;
}
