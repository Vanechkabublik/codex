import { Module } from '@nestjs/common';
import { OffersModule } from '../offers/offers.module';
import { WorkflowService } from './workflow.service';
import { ApprovalQueryService } from './approval-query.service';
import { ApprovalsController } from './approvals.controller';
@Module({
  imports: [OffersModule],
  providers: [WorkflowService, ApprovalQueryService],
  controllers: [ApprovalsController],
  exports: [WorkflowService],
})
export class ApprovalsModule {}
