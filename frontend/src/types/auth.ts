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

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginSuccessResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  mfaSetupRequired: boolean;
  sessionTimeoutMinutes: number;
}

// UC-AUTH-001 passo 4: com MFA ativo, a password devolve só um desafio de curta duração.
export interface MfaChallengeResponse {
  mfaRequired: true;
  challengeToken: string;
}

export type LoginResponse = LoginSuccessResponse | MfaChallengeResponse;

export interface AuthProfile {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  mfaEnabled: boolean;
  // MFA obrigatório para este utilizador (admin com mfaRequiredForAdmin ativo).
  mfaRequired: boolean;
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
