import { create } from 'zustand';
import type { User, LoginCredentials, AuthTokens, LoginResponse } from '@/types/auth';
import { login, refreshAccessToken, logout as apiLogout } from '@/api/auth.api';
import { setAccessToken, setRefreshTokenFn } from '@/api/client';
import { queryClient } from '@/lib/queryClient';

const STORAGE_KEY = 'srh-auth';

interface PersistedAuth {
  accessToken: string | null;
  refreshTokenValue: string | null;
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
}

interface AuthState extends PersistedAuth {
  isLoading: boolean;
  error: string | null;
  pendingMfaEmail: string | null;
  pendingMfaPassword: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => void;
  clearError: () => void;
}

function loadPersistedState(): PersistedAuth {
  const fallback: PersistedAuth = {
    accessToken: null,
    refreshTokenValue: null,
    user: null,
    isAuthenticated: false,
    permissions: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedAuth;
      setAccessToken(parsed.accessToken);
      return parsed;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function savePersistedState(state: PersistedAuth): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const persisted: PersistedAuth = loadPersistedState();

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: persisted.accessToken,
  refreshTokenValue: persisted.refreshTokenValue,
  user: persisted.user,
  isAuthenticated: persisted.isAuthenticated,
  permissions: persisted.permissions,
  isLoading: false,
  error: null,
  pendingMfaEmail: null,
  pendingMfaPassword: null,

  login: async (credentials: LoginCredentials): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const response: LoginResponse = await login(credentials);

      if (response.requiresMfa) {
        set({
          pendingMfaEmail: credentials.email,
          pendingMfaPassword: credentials.password,
          isLoading: false,
        });
        return;
      }

      const newState: PersistedAuth = {
        user: response.user,
        accessToken: response.accessToken,
        refreshTokenValue: response.refreshToken,
        isAuthenticated: true,
        permissions: response.user.roles,
      };
      setAccessToken(newState.accessToken);
      savePersistedState(newState);
      set({
        ...newState,
        isLoading: false,
        error: null,
        pendingMfaEmail: null,
        pendingMfaPassword: null,
      });
    } catch (err) {
      setAccessToken(null);
      clearPersistedState();
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro ao iniciar sessão',
      });
      throw err;
    }
  },

  verifyMfa: async (code: string): Promise<void> => {
    const { pendingMfaEmail, pendingMfaPassword } = get();
    if (!pendingMfaEmail || !pendingMfaPassword) {
      throw new Error('Não existe sessão MFA pendente');
    }

    set({ isLoading: true, error: null });
    try {
      const response: LoginResponse = await login({
        email: pendingMfaEmail,
        password: pendingMfaPassword,
        mfaCode: code,
      });

      const newState: PersistedAuth = {
        user: response.user,
        accessToken: response.accessToken,
        refreshTokenValue: response.refreshToken,
        isAuthenticated: true,
        permissions: response.user.roles,
      };
      setAccessToken(newState.accessToken);
      savePersistedState(newState);
      set({
        ...newState,
        isLoading: false,
        error: null,
        pendingMfaEmail: null,
        pendingMfaPassword: null,
      });
    } catch (err) {
      setAccessToken(null);
      clearPersistedState();
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro ao verificar MFA',
      });
      throw err;
    }
  },

  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  refreshToken: async (): Promise<boolean> => {
    const token = get().refreshTokenValue;
    if (token === null || token === undefined) return false;

    try {
      const response = await refreshAccessToken(token);
      const newState: PersistedAuth = {
        ...get(),
        accessToken: response.accessToken,
        refreshTokenValue: response.refreshToken,
        isAuthenticated: true,
      };
      setAccessToken(newState.accessToken);
      savePersistedState(newState);
      set(newState);
      return true;
    } catch {
      setAccessToken(null);
      clearPersistedState();
      get()
        .logout()
        .catch(() => undefined);
      return false;
    }
  },
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  logout: async (): Promise<void> => {
    const { accessToken } = get();
    if (accessToken) {
      await apiLogout(accessToken).catch(() => undefined);
    }
    setAccessToken(null);
    clearPersistedState();
    queryClient.clear();
    set({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      permissions: [],
      isLoading: false,
      error: null,
      pendingMfaEmail: null,
      pendingMfaPassword: null,
    });
  },

  setTokens: (tokens: AuthTokens): void => {
    const newState: PersistedAuth = {
      ...get(),
      accessToken: tokens.accessToken,
      refreshTokenValue: tokens.refreshToken,
    };
    setAccessToken(newState.accessToken);
    savePersistedState(newState);
    set(newState);
  },

  clearError: (): void => {
    set({ error: null });
  },
}));

setRefreshTokenFn(() => useAuthStore.getState().refreshToken());
