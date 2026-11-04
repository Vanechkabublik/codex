import { ApiProperty } from '@nestjs/swagger';
import { ClientOfferDto } from '../../storefront/dto/storefront-response.dto';
export class ActivationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) clientId!: string;
  @ApiProperty({ format: 'uuid' }) offerId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class ActivatedOfferDto extends ActivationResponseDto {
  @ApiProperty({ type: ClientOfferDto }) offer!: ClientOfferDto;
}
