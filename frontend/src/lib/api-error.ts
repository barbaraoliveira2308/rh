import axios from 'axios';

interface ApiErrorResponse {
  message?: string | string[];
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return fallback;

  const response = error.response;
  const message = response ? response.data.message : undefined;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? fallback;
}
