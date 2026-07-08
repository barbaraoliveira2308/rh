import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CacheModule {}
