import { Queue } from 'bullmq';
import { redisConnection } from './lib/redis.js';

export const reconciliationQueue = new Queue('reconciliation', { connection: redisConnection });
