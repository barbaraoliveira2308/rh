import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { TOTP, Secret } from 'otpauth';
import { toDataURL } from 'qrcode';
import { EncryptionService } from './encryption.service';

export const RECOVERY_CODE_COUNT = 10;

// Base32 sem 0/1/8/9 — os códigos são lidos e escritos à mão, pelo que se evitam caracteres
// que se confundem com O/I/L/B. 10 caracteres deste alfabeto dão 50 bits de entropia, o que
// permite guardá-los com SHA-256 simples, tal como os tokens de reset (decisão P092-01).
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const RECOVERY_CODE_LENGTH = 10;

@Injectable()
export class MfaService {
  private readonly appName: string;

  constructor(
    private readonly encryptionService: EncryptionService,
    configService: ConfigService,
  ) {
    this.appName = configService.get<string>('APP_NAME', 'HR Suite');
  }

  generateSecret(label: string): { secret: string; encryptedSecret: string; qrCodeUrl: string } {
    const totp = new TOTP({
      issuer: this.appName,
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secretBase32 = totp.secret.base32;
    const qrCodeUrl = totp.toString();
    const encrypted = this.encryptionService.encrypt(secretBase32);

    return { secret: secretBase32, encryptedSecret: encrypted, qrCodeUrl };
  }

  // Devolve o passo TOTP (contador da janela de 30 s) a que o código corresponde, ou null se o
  // código não for válido. O passo é o que permite recusar a reutilização de um código (R-065).
  matchTotpStep(encryptedSecret: string, token: string): number | null {
    const secretBase32 = this.encryptionService.decrypt(encryptedSecret);

    const totp = new TOTP({
      secret: Secret.fromBase32(secretBase32),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const timestamp = Date.now();
    const delta = totp.validate({ token, window: 1, timestamp });
    return delta === null ? null : totp.counter({ timestamp }) + delta;
  }

  generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return toDataURL(otpauthUrl);
  }

  generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const chars = Array.from(
        { length: RECOVERY_CODE_LENGTH },
        () => RECOVERY_CODE_ALPHABET[crypto.randomInt(RECOVERY_CODE_ALPHABET.length)],
      ).join('');
      return `${chars.slice(0, 5)}-${chars.slice(5)}`;
    });
  }

  isTotpCode(code: string): boolean {
    return /^\d{6}$/.test(code.trim());
  }

  hashRecoveryCode(code: string): string {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}
