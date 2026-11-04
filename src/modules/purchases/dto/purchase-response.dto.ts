import { ApiProperty } from '@nestjs/swagger';
import {
  CashbackReason,
  EvaluationResult,
} from '../../cashback/cashback.enums';
export class PurchaseResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) clientId!: string;
  @ApiProperty({ format: 'uuid' }) offerId!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ type: String }) amount!: string;
  @ApiProperty() mcc!: string;
  @ApiProperty({ format: 'date-time' }) purchasedAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class EvaluationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) purchaseId!: string;
  @ApiProperty({ format: 'uuid' }) offerId!: string;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) revisionId!:
    string | null;
  @ApiProperty({ enum: EvaluationResult }) result!: EvaluationResult;
  @ApiProperty({ enum: CashbackReason, nullable: true })
  reason!: CashbackReason | null;
  @ApiProperty({ type: String, nullable: true }) explanation!: string | null;
  @ApiProperty() amount!: string;
}
export class AccrualResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) purchaseId!: string;
  @ApiProperty({ format: 'uuid' }) evaluationId!: string;
  @ApiProperty() amount!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class PurchaseResultDto {
  @ApiProperty({ type: PurchaseResponseDto }) purchase!: PurchaseResponseDto;
  @ApiProperty({ type: EvaluationResponseDto })
  evaluation!: EvaluationResponseDto;
  @ApiProperty({ type: AccrualResponseDto, nullable: true })
  accrual!: AccrualResponseDto | null;
}
