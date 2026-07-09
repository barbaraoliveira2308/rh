import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];
let accessToken: string | null = null;
let refreshTokenFn: (() => Promise<boolean>) | null = null;

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshTokenFn(fn: () => Promise<boolean>): void {
  refreshTokenFn = fn;
}

function processQueue(error: Error | null, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.set('Authorization', `Bearer ${token}`);
          return apiClient(originalRequest);
        })
        .catch((err: unknown) =>
          Promise.reject(err instanceof Error ? err : new Error(String(err))),
        );
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      if (!refreshTokenFn) {
        throw new Error('Refresh handler not configured');
      }
      const success: boolean = await refreshTokenFn();
      if (!success) {
        throw new Error('Refresh failed');
      }
      if (!accessToken) {
        throw new Error('No token after refresh');
      }
      processQueue(null, accessToken);
      originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
      return await apiClient(originalRequest);
    } catch (refreshError) {
      const errorToQueue =
        refreshError instanceof Error ? refreshError : new Error(String(refreshError));
      processQueue(errorToQueue, null);
      window.location.href = '/login';
      throw errorToQueue;
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
