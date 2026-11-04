import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreatePurchaseDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'One selected offer to evaluate for this demonstration purchase',
  })
  @IsUUID()
  offerId!: string;
  @ApiProperty({
    maxLength: 100,
    description: 'Idempotency key scoped to the authenticated client',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reference!: string;
  @ApiProperty({ type: String, example: '1000.00' })
  @IsString()
  @Matches(/^\d{1,16}(\.\d{1,2})?$/)
  amount!: string;
  @ApiProperty({ example: '5411' })
  @IsString()
  @Matches(/^\d{4}$/)
  mcc!: string;
  @ApiProperty({ format: 'date-time' })
  @IsDateString({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  purchasedAt!: string;
}
