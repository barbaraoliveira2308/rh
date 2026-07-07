import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit:metadata';

export interface AuditMetadata {
  action: string;
  entityType: string;
}

export function Audit(action: string, entityType: string): ReturnType<typeof SetMetadata> {
  return SetMetadata(AUDIT_KEY, { action, entityType });
}
