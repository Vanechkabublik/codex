import { Module } from '@nestjs/common';
import { CashbackService } from './cashback.service';
@Module({
  imports: [],
  providers: [CashbackService],
  controllers: [],
  exports: [CashbackService],
})
export class CashbackModule {}
