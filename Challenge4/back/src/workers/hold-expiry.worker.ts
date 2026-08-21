import { Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { workerLogger } from '../lib/logger.js';
import type { HoldExpiryJobData } from '../queues/queues.js';

/**
 * Idempotente por diseño (ver ADR-008): solo actúa si la cita sigue en
 * `pending`. Si el pago ya llegó o la cita ya se canceló, no hace nada — por
 * eso esta cola no necesita retry.
 */
export const holdExpiryWorker = new Worker<HoldExpiryJobData>(
  'hold-expiry',
  async (job) => {
    const { appointmentId, requestId } = job.data;
    const log = workerLogger(requestId);

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
