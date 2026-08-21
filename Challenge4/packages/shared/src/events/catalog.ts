/**
 * Catálogo único de eventos entre servicios. Cambiar el nombre de un stream o
 * el shape de un payload aquí es un cambio de contrato — coordínalo con el
 * ADR de versionado de APIs, igual que un cambio a un endpoint OpenAPI.
 */
export const EVENT_STREAMS = {
  userRegistered: 'events:user-registered',
  paymentConfirmed: 'events:payment-confirmed',
  notificationDelivered: 'events:notification-delivered',
} as const;

/** Auth -> quien necesite proyectar {id, name, email, role} localmente (hoy: Appointments). */
export interface UserRegisteredPayload {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'staff';
}

/** Payments -> Appointments. Payments no sabe nada de "citas", solo que un pago se confirmó. */
export interface PaymentConfirmedPayload {
  appointmentId: string;
  paymentIntentId: string;
  amountCents: number;
}

/**
 * Notifications -> Appointments, después de intentar enviar un email. Le
 * permite a Appointments registrar el AppointmentEvent correspondiente
 * (confirmation_sent/notification_failed/reminder_sent/reminder_failed) sin
 * que Notifications necesite escribir en la base de Appointments.
 */
export interface NotificationDeliveredPayload {
  appointmentId: string;
  kind: 'confirmation' | 'reminder';
  status: 'sent' | 'failed';
  errorMessage?: string;
}
