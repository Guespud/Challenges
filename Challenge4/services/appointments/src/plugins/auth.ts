import { createAuthGuards } from '@vitalis/shared';
import { env } from '../config/env.js';

export const { authenticate, requireRole } = createAuthGuards(env.JWT_ACCESS_SECRET);
