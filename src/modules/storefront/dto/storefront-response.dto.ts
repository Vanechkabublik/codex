import { ApiProperty } from '@nestjs/swagger';
import { OfferType } from '../../offers/offer.enums';
export class ClientOfferDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: String, nullable: true }) category!: string | null;
  @ApiProperty({ enum: OfferType, nullable: true }) type!: OfferType | null;
  @ApiProperty({ type: String, nullable: true }) cashbackPercent!:
    string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startsAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt!: Date | null;
  @ApiProperty({ type: [String] }) mccCodes!: string[];
  @ApiProperty({ type: String, nullable: true }) clientDescription!:
    string | null;
  @ApiProperty() activated!: boolean;
}
export class BaseCategoryDto {
  @ApiProperty({ example: 'BASE_CASHBACK' }) code!: string;
  @ApiProperty({ example: '1% на всё' }) title!: string;
  @ApiProperty({ example: '1.00' }) cashbackPercent!: string;
}
export class StorefrontResponseDto {
  @ApiProperty({ type: [ClientOfferDto], maxItems: 7 })
  offers!: ClientOfferDto[];
  @ApiProperty({ type: BaseCategoryDto }) baseCategory!: BaseCategoryDto;
}
