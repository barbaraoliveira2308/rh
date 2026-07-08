import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.s3 = new S3Client({
      endpoint: configService.get<string>('STORAGE_ENDPOINT'),
      region: configService.get<string>('STORAGE_REGION', 'eu-west-1'),
      credentials: {
        accessKeyId: configService.get<string>('STORAGE_ACCESS_KEY', ''),
        secretAccessKey: configService.get<string>('STORAGE_SECRET_KEY', ''),
      },
      forcePathStyle: true,
    });
    this.bucket = configService.get<string>('STORAGE_BUCKET', 'srh-documents');
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn },
    );
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
