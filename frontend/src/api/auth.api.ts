import axios from 'axios';
import apiClient from './client';
import type {
  LoginCredentials,
  AuthTokens,
  LoginResponse,
  LoginSuccessResponse,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
  AuthProfile,
  MfaSetupResponse,
  RecoveryCodesResponse,
} from '@/types/auth';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const publicClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await publicClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
}

export async function loginMfa(
  challengeToken: string,
  code: string,
): Promise<LoginSuccessResponse> {
  const response = await publicClient.post<LoginSuccessResponse>('/auth/login/mfa', {
    challengeToken,
    code,
  });
  return response.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const response = await publicClient.post<AuthTokens>('/auth/refresh', { refreshToken });
  return response.data;
}

export async function logout(accessToken: string): Promise<void> {
  await publicClient.post(
    '/auth/logout',
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

export async function requestPasswordReset(
  data: ResetPasswordRequest,
): Promise<{ message: string }> {
  const response = await publicClient.post<{ message: string }>(
    '/auth/password/reset-request',
    data,
  );
  return response.data;
}

export async function confirmPasswordReset(
  data: ConfirmResetPasswordRequest,
): Promise<{ message: string }> {
  const response = await publicClient.post<{ message: string }>('/auth/password/reset', data);
  return response.data;
}

export async function fetchAuthProfile(): Promise<AuthProfile> {
  const response = await apiClient.get<AuthProfile>('/auth/me');
  return response.data;
}

export async function startMfaSetup(): Promise<MfaSetupResponse> {
  const response = await apiClient.post<MfaSetupResponse>('/auth/mfa/enable');
  return response.data;
}

export async function confirmMfaSetup(code: string): Promise<RecoveryCodesResponse> {
  const response = await apiClient.post<RecoveryCodesResponse>('/auth/mfa/verify', { code });
  return response.data;
}

export async function regenerateRecoveryCodes(code: string): Promise<RecoveryCodesResponse> {
  const response = await apiClient.post<RecoveryCodesResponse>('/auth/mfa/recovery-codes', {
    code,
  });
  return response.data;
}

export async function disableMfa(
  code: string,
): Promise<{ message: string; sessionEnded: boolean }> {
  const response = await apiClient.post<{ message: string; sessionEnded: boolean }>(
    '/auth/mfa/disable',
    { code },
  );
  return response.data;
}
