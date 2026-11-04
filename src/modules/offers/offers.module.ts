import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { OfferAccessService } from './offer-access.service';
import { OfferAuditService } from './offer-audit.service';
@Module({
  controllers: [OffersController],
  providers: [OffersService, OfferAccessService, OfferAuditService],
  exports: [OffersService, OfferAccessService, OfferAuditService],
})
export class OffersModule {}
