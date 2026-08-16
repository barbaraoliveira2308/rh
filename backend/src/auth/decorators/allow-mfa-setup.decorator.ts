import { SetMetadata } from '@nestjs/common';

export const ALLOW_MFA_SETUP_KEY = 'auth:allow-mfa-setup';

export const AllowMfaSetup = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ALLOW_MFA_SETUP_KEY, true);
