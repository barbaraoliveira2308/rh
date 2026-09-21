import { create } from 'zustand';
import { isAxiosError } from 'axios';
import type { User, LoginCredentials, AuthTokens, LoginSuccessResponse } from '@/types/auth';
import { login, loginMfa, refreshAccessToken, logout as apiLogout } from '@/api/auth.api';
import { setAccessToken, setRefreshTokenFn } from '@/api/client';
import { queryClient } from '@/lib/queryClient';
import { getErrorMessage } from '@/lib/utils';

const STORAGE_KEY = 'srh-auth';

interface PersistedAuth {
  accessToken: string | null;
  refreshTokenValue: string | null;
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  // Admin sem MFA com mfaRequiredForAdmin ativo: o token só serve para configurar o MFA.
  mfaSetupRequired: boolean;
}

interface AuthState extends PersistedAuth {
  isLoading: boolean;
  error: string | null;
  // Token do desafio MFA devolvido pelo login. O browser nunca guarda a password (P093-01).
  pendingMfaChallenge: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  cancelMfa: () => void;
  completeMfaSetup: () => Promise<boolean>;
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
    mfaSetupRequired: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedAuth>;
      setAccessToken(parsed.accessToken ?? null);
      return { ...fallback, ...parsed };
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

function sessionStateFrom(response: LoginSuccessResponse): PersistedAuth {
  return {
    user: response.user,
    accessToken: response.accessToken,
    refreshTokenValue: response.refreshToken,
    isAuthenticated: true,
    permissions: response.user.roles,
    mfaSetupRequired: response.mfaSetupRequired,
  };
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
  mfaSetupRequired: persisted.mfaSetupRequired,
  isLoading: false,
  error: null,
  pendingMfaChallenge: null,

  login: async (credentials: LoginCredentials): Promise<void> => {
    set({ isLoading: true, error: null, pendingMfaChallenge: null });
    try {
      const response = await login(credentials);

      if ('mfaRequired' in response) {
        set({ pendingMfaChallenge: response.challengeToken, isLoading: false });
        return;
      }

      const newState = sessionStateFrom(response);
      setAccessToken(newState.accessToken);
      savePersistedState(newState);
      set({ ...newState, isLoading: false, error: null });
    } catch (err) {
      setAccessToken(null);
      clearPersistedState();
      set({
        isLoading: false,
        error: getErrorMessage(err, 'Erro ao iniciar sessão'),
      });
      throw err;
    }
  },

  verifyMfa: async (code: string): Promise<void> => {
    const { pendingMfaChallenge } = get();
    if (!pendingMfaChallenge) {
      throw new Error('Não existe sessão MFA pendente');
    }

    set({ isLoading: true, error: null });
    try {
      const response = await loginMfa(pendingMfaChallenge, code);
      const newState = sessionStateFrom(response);
      setAccessToken(newState.accessToken);
      savePersistedState(newState);
      set({ ...newState, isLoading: false, error: null, pendingMfaChallenge: null });
    } catch (err) {
      // Um código errado mantém o desafio (o utilizador corrige e volta a tentar). Um desafio
      // expirado (401 sem ser de código) ou a conta bloqueada (403) obrigam a recomeçar.
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const message = getErrorMessage(err, 'Erro ao verificar o código');
      const mustRestart = status === 403 || (status === 401 && message !== 'Código MFA inválido');
      set({
        isLoading: false,
        error: message,
        ...(mustRestart ? { pendingMfaChallenge: null } : {}),
      });
      throw err;
    }
  },

  cancelMfa: (): void => {
    set({ pendingMfaChallenge: null, error: null });
  },

  // O token de âmbito limitado só é trocado por um normal num refresh, que recalcula o âmbito
  // a partir da BD — por isso concluir a configuração do MFA é um refresh.
  completeMfaSetup: async (): Promise<boolean> => {
    const refreshed = await get().refreshToken();
    if (!refreshed) return false;
    const newState: PersistedAuth = { ...get(), mfaSetupRequired: false };
    savePersistedState(newState);
    set({ mfaSetupRequired: false });
    return true;
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
      mfaSetupRequired: false,
      isLoading: false,
      error: null,
      pendingMfaChallenge: null,
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
