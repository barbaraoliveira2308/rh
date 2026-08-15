import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TOTP, Secret } from 'otpauth';
import { MfaService } from './mfa.service';
import { EncryptionService } from './encryption.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              if (key === 'MFA_ENCRYPTION_KEY') return 'test-encryption-key-32chars!';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
  });

  describe('generateSecret', () => {
    it('deve gerar um segredo, a sua versão encriptada e o URL do QR code', () => {
      const result = service.generateSecret('user-1');

      expect(result.secret).toBeDefined();
      expect(result.encryptedSecret).toBeDefined();
      expect(result.encryptedSecret).not.toBe(result.secret);
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
      expect(result.qrCodeUrl).toContain('user-1');
    });
  });

  describe('validateToken', () => {
    it('deve validar um token TOTP correto gerado a partir do mesmo segredo', () => {
      const { secret, encryptedSecret } = service.generateSecret('user-1');
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const validToken = totp.generate();

      const result = service.validateToken(encryptedSecret, validToken);

      expect(result).toBe(true);
    });

    it('deve rejeitar um token inválido', () => {
      const { encryptedSecret } = service.generateSecret('user-1');

      const result = service.validateToken(encryptedSecret, '000000');

      expect(result).toBe(false);
    });
  });

  describe('generateQrCodeDataUrl', () => {
    it('deve devolver um data URL de imagem PNG', async () => {
      const { encryptedSecret } = service.generateSecret('user-1');

      const result = await service.generateQrCodeDataUrl(encryptedSecret);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });
});
