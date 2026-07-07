import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOTP, Secret } from 'otpauth';
import { toDataURL } from 'qrcode';
import { EncryptionService } from './encryption.service';

@Injectable()
export class MfaService {
  private readonly appName: string;

  constructor(
    private readonly encryptionService: EncryptionService,
    configService: ConfigService,
  ) {
    this.appName = configService.get<string>('APP_NAME', 'HR Suite');
  }

  generateSecret(userId: string): { secret: string; encryptedSecret: string; qrCodeUrl: string } {
    const totp = new TOTP({
      issuer: this.appName,
      label: userId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secretBase32 = totp.secret.base32;
    const qrCodeUrl = this.generateQrCodeUrl(totp);
    const encrypted = this.encryptionService.encrypt(secretBase32);

    return { secret: secretBase32, encryptedSecret: encrypted, qrCodeUrl };
  }

  validateToken(encryptedSecret: string, token: string): boolean {
    const secretBase32 = this.encryptionService.decrypt(encryptedSecret);

    const totp = new TOTP({
      secret: Secret.fromBase32(secretBase32),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }

  async generateQrCodeDataUrl(encryptedSecret: string): Promise<string> {
    const secretBase32 = this.encryptionService.decrypt(encryptedSecret);

    const totp = new TOTP({
      secret: Secret.fromBase32(secretBase32),
      issuer: this.appName,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const otpauthUrl = totp.toString();
    return toDataURL(otpauthUrl);
  }

  private generateQrCodeUrl(totp: TOTP): string {
    const otpauthUrl = totp.toString();
    return otpauthUrl;
  }
}
