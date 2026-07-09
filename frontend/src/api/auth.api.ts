import axios from 'axios';
import type { LoginCredentials, MfaCredentials, AuthTokens, LoginResponse } from '@/types/auth';

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

export async function verifyMfa(credentials: MfaCredentials): Promise<LoginResponse> {
  const response = await publicClient.post<LoginResponse>('/auth/mfa/verify', credentials);
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
