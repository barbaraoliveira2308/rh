import 'reflect-metadata';

export const GDPR_SENSITIVE_KEY = 'gdpr:sensitive';

export function GdprSensitive(target: object, propertyKey: string | symbol): void {
  Reflect.defineMetadata(GDPR_SENSITIVE_KEY, true, target, propertyKey);
}
