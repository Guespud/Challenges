import type { z } from 'zod';
import { AppError } from './errors.js';

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues;
    const message = issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');

    const isBusinessRuleViolation = issues.length > 0 && issues.every((issue) => issue.code === 'custom');
    throw new AppError(isBusinessRuleViolation ? 422 : 400, message);
  }
  return result.data;
}
