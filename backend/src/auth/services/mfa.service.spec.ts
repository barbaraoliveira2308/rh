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

  describe('matchTotpStep', () => {
    it('deve devolver o passo TOTP atual para um código correto', () => {
      const { secret, encryptedSecret } = service.generateSecret('user-1');
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const step = totp.counter();

      const result = service.matchTotpStep(encryptedSecret, totp.generate());

      // O passo pode avançar entre ler o contador e gerar o código, se cruzar a fronteira dos 30 s.
      expect([step, step + 1]).toContain(result);
    });

    it('deve devolver o passo anterior para o código da janela anterior', () => {
      const { secret, encryptedSecret } = service.generateSecret('user-1');
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const timestamp = Date.now() - 30_000;

      const result = service.matchTotpStep(encryptedSecret, totp.generate({ timestamp }));

      expect(result).toBe(totp.counter({ timestamp }));
    });

    it('deve devolver null para um código inválido', () => {
      const { secret, encryptedSecret } = service.generateSecret('user-1');
      const current = new TOTP({ secret: Secret.fromBase32(secret) }).generate();

      const result = service.matchTotpStep(
        encryptedSecret,
        current === '000000' ? '111111' : '000000',
      );

      expect(result).toBeNull();
    });
  });

  describe('generateQrCodeDataUrl', () => {
    it('deve devolver um data URL de imagem PNG', async () => {
      const { qrCodeUrl } = service.generateSecret('user-1');

      const result = await service.generateQrCodeDataUrl(qrCodeUrl);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('deve gerar 10 códigos distintos no formato XXXXX-XXXXX (UC-AUTH-005 passo 6)', () => {
      const codes = service.generateRecoveryCodes();

      expect(codes).toHaveLength(10);
      expect(new Set(codes).size).toBe(10);
      for (const code of codes) {
        expect(code).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
      }
    });
  });

  describe('hashRecoveryCode', () => {
    it('deve produzir o mesmo hash independentemente de maiúsculas, espaços e hífen', () => {
      const [code] = service.generateRecoveryCodes();

      expect(service.hashRecoveryCode(code.toLowerCase().replace('-', ' '))).toBe(
        service.hashRecoveryCode(code),
      );
      expect(service.hashRecoveryCode(code)).not.toContain(code);
    });
  });

  describe('isTotpCode', () => {
    it('deve distinguir um código TOTP de um código de recuperação', () => {
      expect(service.isTotpCode('123456')).toBe(true);
      expect(service.isTotpCode('ABCDE-FGHIJ')).toBe(false);
    });
  });
});
