import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'node:crypto';
import { JwtService } from './jwt.service';

function generateTestKeyPairBase64(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return {
    privateKey: Buffer.from(privateKey).toString('base64'),
    publicKey: Buffer.from(publicKey).toString('base64'),
  };
}

describe('JwtService', () => {
  let service: JwtService;

  const accessKeyPair = generateTestKeyPairBase64();
  const refreshKeyPair = generateTestKeyPairBase64();

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_PRIVATE_KEY: accessKeyPair.privateKey,
        JWT_ACCESS_PUBLIC_KEY: accessKeyPair.publicKey,
        JWT_REFRESH_PRIVATE_KEY: refreshKeyPair.privateKey,
        JWT_REFRESH_PUBLIC_KEY: refreshKeyPair.publicKey,
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
  };

  const mockRoles = ['employee'];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = service.generateAccessToken(mockUser, mockRoles);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user claims in the token', () => {
      const token = service.generateAccessToken(mockUser, mockRoles);
      const payload = service.verifyAccessToken(token);
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.username).toBe(mockUser.username);
      expect(payload.roles).toEqual(mockRoles);
    });

    it('should not include mfaSetupRequired claim by default', () => {
      const token = service.generateAccessToken(mockUser, mockRoles);
      const payload = service.verifyAccessToken(token);
      expect(payload.mfaSetupRequired).toBeUndefined();
    });

    it('should include mfaSetupRequired claim when requested', () => {
      const token = service.generateAccessToken(mockUser, mockRoles, true);
      const payload = service.verifyAccessToken(token);
      expect(payload.mfaSetupRequired).toBe(true);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = service.generateRefreshToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify refresh token and return user id', () => {
      const token = service.generateRefreshToken(mockUser);
      const payload = service.verifyRefreshToken(token);
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.jti).toBeDefined();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const pair = service.generateTokenPair(mockUser, mockRoles);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.accessToken).not.toBe(pair.refreshToken);
    });

    it('should propagate mfaSetupRequired into the access token', () => {
      const pair = service.generateTokenPair(mockUser, mockRoles, true);
      const payload = service.verifyAccessToken(pair.accessToken);
      expect(payload.mfaSetupRequired).toBe(true);
    });
  });

  describe('verifyAccessToken', () => {
    it('should throw UnauthorizedException for invalid token', () => {
      expect(() => service.verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw UnauthorizedException for expired token', () => {
      const expiredToken = jwt.sign(
        { sub: mockUser.id, email: mockUser.email, username: mockUser.username, roles: mockRoles },
        Buffer.from(accessKeyPair.privateKey, 'base64').toString('utf8'),
        { algorithm: 'RS256', expiresIn: '0s' },
      );
      expect(() => service.verifyAccessToken(expiredToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should throw UnauthorizedException for invalid refresh token', () => {
      expect(() => service.verifyRefreshToken('invalid-token')).toThrow();
    });
  });

  describe('computeTokenHash', () => {
    it('should return a SHA-256 hash', () => {
      const hash = service.computeTokenHash('test-token');
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should return the same hash for the same input', () => {
      const hash1 = service.computeTokenHash('test-token');
      const hash2 = service.computeTokenHash('test-token');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = service.computeTokenHash('token-a');
      const hash2 = service.computeTokenHash('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});
