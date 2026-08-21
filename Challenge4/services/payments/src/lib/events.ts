import { createEventPublisher } from '@vitalis/shared';
import { env } from '../config/env.js';

export const eventPublisher = createEventPublisher(env.REDIS_URL);
