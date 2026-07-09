export interface User {
  id: string;
  email: string;
  username: string;
  roles: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
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
  user: User;
  tokens: AuthTokens;
  requiresMfa?: boolean;
}
