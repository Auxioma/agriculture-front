import { vi } from 'vitest';
import { AuthService } from './auth.service';

export type AuthServiceMock = Pick<AuthService, 'initAuthState' | 'isAuthenticated'> & {
  initAuthState: ReturnType<typeof vi.fn<AuthService['initAuthState']>>;
  isAuthenticated: ReturnType<typeof vi.fn<AuthService['isAuthenticated']>>;
};

export function createAuthServiceMock(): AuthServiceMock {
  return {
    initAuthState: vi.fn(),
    isAuthenticated: vi.fn(),
  };
}
