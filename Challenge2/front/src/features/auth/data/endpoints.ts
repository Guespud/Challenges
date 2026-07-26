import { apiRequest } from '../../../core/api';
import type { LoginInput, RegisterInput } from './auth.schema';
import type { User } from '../../../types';

export const authApi = {
  register: (input: RegisterInput) =>
    apiRequest<User>('/auth/register', { method: 'POST', body: input, auth: false }),

  login: (input: LoginInput) =>
    apiRequest<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  me: () => apiRequest<User>('/me'),
};
