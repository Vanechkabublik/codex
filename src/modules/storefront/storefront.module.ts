import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
@Module({
  imports: [],
  providers: [StorefrontService],
  controllers: [StorefrontController],
  exports: [StorefrontService],
})
export class StorefrontModule {}
