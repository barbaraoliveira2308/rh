export interface User {
  id: string;
  email: string;
  username: string;
  roles: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface MfaCredentials {
  email: string;
  password: string;
  mfaCode: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresMfa?: boolean;
}

export interface ResetPasswordRequest {
  email: string;
}
