import { Global, Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule {}
