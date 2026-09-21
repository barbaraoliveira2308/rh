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
  mfaSetupRequired: boolean;
}

export interface AuthProfile {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  roles: string[];
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
}

export interface RecoveryCodesResponse {
  recoveryCodes: string[];
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
}
