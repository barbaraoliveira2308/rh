import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  providers: [CacheService, RedisCacheService],
  exports: [CacheService, RedisCacheService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CacheModule {}
