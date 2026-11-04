import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { OfferStatus, OfferType } from '../offer.enums';
const provided = (_object: unknown, value: unknown) => value !== undefined;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class SaveOfferDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category?: string;
  @ApiPropertyOptional({ enum: OfferType })
  @ValidateIf(provided)
  @IsEnum(OfferType)
  type?: OfferType;
  @ApiPropertyOptional({
    type: String,
    example: '10.00',
    description: 'Decimal string, >0 and <=100, up to 2 fractional digits',
  })
  @ValidateIf(provided)
  @IsString()
  @Matches(/^\d{1,3}(\.\d{1,2})?$/)
  cashbackPercent?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @ValidateIf(provided)
  @IsDateString({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  startsAt?: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @ValidateIf(provided)
  @IsDateString({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  endsAt?: string;
  @ApiPropertyOptional({
    type: String,
    example: '100000.00',
    description:
      'Positive decimal string, up to 16 integer and 2 fractional digits',
  })
  @ValidateIf(provided)
  @IsString()
  @Matches(/^\d{1,16}(\.\d{1,2})?$/)
  payoutLimit?: string;
  @ApiPropertyOptional({ type: [String], example: ['5411', '5812'] })
  @ValidateIf(provided)
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @Matches(/^\d{4}$/, { each: true })
  mccCodes?: string[];
  @ApiPropertyOptional({ maxLength: 5000 })
  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  clientDescription?: string;
}
export class OfferListDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OfferStatus })
  @ValidateIf(provided)
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}
