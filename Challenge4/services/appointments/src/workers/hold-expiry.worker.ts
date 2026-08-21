import { Worker } from 'bullmq';
import { childLogger, createLogger } from '@vitalis/shared';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import type { HoldExpiryJobData } from '../queues.js';

const baseLogger = createLogger('appointments-worker');

/**
 * Idempotente por diseño: solo actúa si la cita sigue en `pending`. Si el
 * pago ya llegó (PaymentConfirmed) o la cita ya se canceló, no hace nada —
 * por eso esta cola no necesita retry.
 */
export const holdExpiryWorker = new Worker<HoldExpiryJobData>(
  'hold-expiry',
  async (job) => {
    const { appointmentId, requestId } = job.data;
    const log = childLogger(baseLogger, requestId);

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.status !== 'pending') {
      return;
    }

    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'cancelled', holdExpiresAt: null },
      }),
      prisma.appointmentEvent.create({ data: { appointmentId, type: 'hold_expired' } }),
    ]);

    log.info({ appointmentId }, 'hold expirado sin pago, cita cancelada');
  },
  { connection: redisConnection },
);
