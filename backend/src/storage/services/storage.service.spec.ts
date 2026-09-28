import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

type S3Command = PutObjectCommand | GetObjectCommand | DeleteObjectCommand;

const mockSend = jest.fn<Promise<unknown>, [S3Command]>();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    mockSend.mockReset();
    (getSignedUrl as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              const values: Record<string, string> = {
                STORAGE_ENDPOINT: 'http://rustfs:9000',
                STORAGE_BUCKET: 'srh-documents',
              };
              return values[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('upload', () => {
    it('deve enviar o PutObjectCommand com o bucket, chave e conteúdo corretos', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.upload(
        'documents/x.pdf',
        Buffer.from('conteúdo'),
        'application/pdf',
      );

      expect(mockSend).toHaveBeenCalled();
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: 'srh-documents',
          Key: 'documents/x.pdf',
          ContentType: 'application/pdf',
        }),
      );
      expect(result).toBe('documents/x.pdf');
    });
  });

  describe('getPresignedUrl', () => {
    it('deve devolver o URL assinado gerado pelo SDK', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://presigned-url');

      const result = await service.getPresignedUrl('documents/x.pdf', 600);

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 600,
      });
      expect(result).toBe('https://presigned-url');
    });
  });

  describe('getObjectStream', () => {
    it('deve devolver o corpo e o tipo de conteúdo do objeto', async () => {
      const fakeBody = { pipe: jest.fn() };
      mockSend.mockResolvedValue({ Body: fakeBody, ContentType: 'application/pdf' });

      const result = await service.getObjectStream('documents/x.pdf');

      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual({ body: fakeBody, contentType: 'application/pdf' });
    });
  });

  describe('delete', () => {
    it('deve enviar o DeleteObjectCommand com o bucket e chave corretos', async () => {
      mockSend.mockResolvedValue({});

      await service.delete('documents/x.pdf');

      expect(mockSend).toHaveBeenCalled();
      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({ Bucket: 'srh-documents', Key: 'documents/x.pdf' }),
      );
    });
  });
});
