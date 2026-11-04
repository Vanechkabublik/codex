import { Module } from '@nestjs/common';
import { StorefrontModule } from '../storefront/storefront.module';
import { ActivationsController } from './activations.controller';
import { ActivationsService } from './activations.service';
@Module({
  imports: [StorefrontModule],
  providers: [ActivationsService],
  controllers: [ActivationsController],
  exports: [],
})
export class ActivationsModule {}
