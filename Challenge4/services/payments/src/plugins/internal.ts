import { createInternalGuard } from '@vitalis/shared';
import { env } from '../config/env.js';

export const requireInternalToken = createInternalGuard(env.INTERNAL_SERVICE_TOKEN);
