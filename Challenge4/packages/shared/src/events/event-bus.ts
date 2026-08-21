import { Redis } from 'ioredis';

export interface DomainEvent<T = unknown> {
  type: string;
  data: T;
  requestId: string;
  publishedAt?: string;
}

/**
 * Un stream de Redis por tipo de evento, consumer groups por servicio
 * consumidor (cada grupo recibe una copia completa del stream - eso es lo
 * que da el fan-out entre servicios). At-least-once: el mensaje se ACKea
 * solo si onEvent no lanza; si falla, queda pendiente en el grupo hasta que
 * el reclaim (XAUTOCLAIM, ver startEventConsumer) lo vuelve a intentar.
 */
export function createEventPublisher(redisUrl: string) {
  const redis = new Redis(redisUrl);

  async function publish<T>(stream: string, event: Omit<DomainEvent<T>, 'publishedAt'>): Promise<string> {
    const payload: DomainEvent<T> = { ...event, publishedAt: new Date().toISOString() };
    const id = await redis.xadd(stream, '*', 'payload', JSON.stringify(payload));
    if (!id) throw new Error(`XADD a "${stream}" no devolvió un id`);
    return id;
  }

  async function close(): Promise<void> {
    await redis.quit();
  }

  return { publish, close };
}

interface EventConsumerOptions {
  redisUrl: string;
  stream: string;
  /** Nombre del servicio consumidor - un consumer group por servicio. */
  group: string;
  consumerName: string;
  onEvent: (event: DomainEvent, messageId: string) => Promise<void>;
  /** Reintentos antes de mandar el mensaje al stream `${stream}:dead-letter`. Default 5. */
  maxDeliveries?: number;
  /** Tiempo mínimo (ms) que un mensaje pendiente debe estar sin ACK antes de reclamarlo. Default 30s. */
  claimMinIdleMs?: number;
}

function isBusyGroupError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('BUSYGROUP');
}

export function startEventConsumer(options: EventConsumerOptions): { stop: () => void } {
  const redis = new Redis(options.redisUrl);
  let running = true;
  const maxDeliveries = options.maxDeliveries ?? 5;
  const claimMinIdleMs = options.claimMinIdleMs ?? 30_000;
  const deadLetterStream = `${options.stream}:dead-letter`;

  async function ensureGroup(): Promise<void> {
    try {
      await redis.xgroup('CREATE', options.stream, options.group, '0', 'MKSTREAM');
    } catch (error) {
      if (!isBusyGroupError(error)) throw error;
    }
  }

  async function deliveryCount(id: string): Promise<number> {
    const pending = (await redis.xpending(options.stream, options.group, id, id, 1)) as
      | [string, string, number, number][]
      | null;
    if (!pending || pending.length === 0) return 0;
    return pending[0][3];
  }

  async function sendToDeadLetter(id: string, fields: string[], reason: string): Promise<void> {
    const payloadIndex = fields.indexOf('payload');
    await redis.xadd(deadLetterStream, '*', 'payload', fields[payloadIndex + 1], 'originalId', id, 'reason', reason);
    await redis.xack(options.stream, options.group, id);
    // eslint-disable-next-line no-console
    console.error(`[event-consumer] ${options.stream}:${id} superó ${maxDeliveries} intentos, movido a ${deadLetterStream}`);
  }

  async function processMessage(id: string, fields: string[]): Promise<void> {
    const payloadIndex = fields.indexOf('payload');
    const event = JSON.parse(fields[payloadIndex + 1]) as DomainEvent;
    try {
      await options.onEvent(event, id);
      await redis.xack(options.stream, options.group, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`[event-consumer] fallo procesando ${options.stream}:${id}`, error);
      const deliveries = await deliveryCount(id);
      if (deliveries >= maxDeliveries) {
        await sendToDeadLetter(id, fields, message);
      }
      // si no llegó al límite, se deja sin ACK — el reclaim lo reintenta
    }
  }

  /**
   * Reclama mensajes que quedaron pendientes (sin ACK) por más de
   * claimMinIdleMs — cubre el caso de un consumer que se cae a mitad de
   * proceso y nunca vuelve a ACKear ni a reintentar por su cuenta.
   */
  async function reclaimStale(): Promise<void> {
    const result = (await redis.xautoclaim(
      options.stream,
      options.group,
      options.consumerName,
      claimMinIdleMs,
      '0-0',
      'COUNT',
      10,
    )) as [string, [string, string[]][], string[]];
    const [, messages] = result;
    for (const [id, fields] of messages) {
      if (fields.length === 0) continue; // entrada "tombstoned" (ya borrada del stream)
      const deliveries = await deliveryCount(id);
      if (deliveries > maxDeliveries) {
        await sendToDeadLetter(id, fields, 'max_deliveries_exceeded');
        continue;
      }
      await processMessage(id, fields);
    }
  }

  async function loop(): Promise<void> {
    await ensureGroup();

    while (running) {
      await reclaimStale();

      const results = (await redis.xreadgroup(
        'GROUP',
        options.group,
        options.consumerName,
        'COUNT',
        10,
        'BLOCK',
        5000,
        'STREAMS',
        options.stream,
        '>',
      )) as [string, [string, string[]][]][] | null;

      if (!results) continue;

      for (const [, messages] of results) {
        for (const [id, fields] of messages) {
          await processMessage(id, fields);
        }
      }
    }
  }

  loop().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(`[event-consumer] loop de "${options.stream}" se cayó`, error);
  });

  return {
    stop: () => {
      running = false;
    },
  };
}
