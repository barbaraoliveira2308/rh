import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'MFA_ENCRYPTION_KEY') return 'test-encryption-key-32chars!';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt a string', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (different IV)', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty string', () => {
    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle special characters', () => {
    const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw on missing MFA_ENCRYPTION_KEY', () => {
    expect(() => {
      new EncryptionService({
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService);
    }).toThrow('MFA_ENCRYPTION_KEY environment variable is required');
  });
});
