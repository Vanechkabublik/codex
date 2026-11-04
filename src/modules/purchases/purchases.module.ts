import { Module } from '@nestjs/common';
import { CashbackModule } from '../cashback/cashback.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
@Module({
  imports: [CashbackModule],
  providers: [PurchasesService],
  controllers: [PurchasesController],
  exports: [],
})
export class PurchasesModule {}
