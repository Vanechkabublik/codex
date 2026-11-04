import { ApiProperty } from '@nestjs/swagger';
import { OfferStatus, OfferType, ReviewDecision } from '../offer.enums';
import { Role } from '../../users/role.enum';
export class OfferResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) ownerId!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: String, nullable: true }) category!: string | null;
  @ApiProperty({ enum: OfferType, nullable: true }) type!: OfferType | null;
  @ApiProperty({ type: String, nullable: true }) cashbackPercent!:
    string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startsAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt!: Date | null;
  @ApiProperty({ type: String, nullable: true }) payoutLimit!: string | null;
  @ApiProperty() payoutSpent!: string;
  @ApiProperty({ type: [String] }) mccCodes!: string[];
  @ApiProperty({ type: String, nullable: true }) clientDescription!:
    string | null;
  @ApiProperty({ enum: OfferStatus }) status!: OfferStatus;
  @ApiProperty() roundNumber!: number;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}
export class ReviewResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) roundId!: string;
  @ApiProperty({ format: 'uuid' }) reviewerId!: string;
  @ApiProperty({ enum: Role }) reviewerRole!: Role;
  @ApiProperty({ enum: ReviewDecision }) decision!: ReviewDecision;
  @ApiProperty() comment!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class OfferSnapshotResponseDto {
  @ApiProperty() title!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ enum: OfferType }) type!: OfferType;
  @ApiProperty({ example: '10.00' }) cashbackPercent!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty({ example: '100000.00' }) payoutLimit!: string;
  @ApiProperty({ type: [String] }) mccCodes!: string[];
  @ApiProperty() clientDescription!: string;
}
export class RevisionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) offerId!: string;
  @ApiProperty({ format: 'uuid' }) authorId!: string;
  @ApiProperty() number!: number;
  @ApiProperty({
    type: OfferSnapshotResponseDto,
    description: 'Immutable business data snapshot',
  })
  snapshot!: OfferSnapshotResponseDto;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class RoundResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) offerId!: string;
  @ApiProperty({ format: 'uuid' }) revisionId!: string;
  @ApiProperty() number!: number;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  closedAt!: Date | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: RevisionResponseDto }) revision!: RevisionResponseDto;
  @ApiProperty({ type: [ReviewResponseDto] }) reviews!: ReviewResponseDto[];
}
export class LaunchBlockerDto {
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ required: false }) role?: string;
}
export class OfferCardResponseDto extends OfferResponseDto {
  @ApiProperty({ type: RoundResponseDto, nullable: true })
  currentRound!: RoundResponseDto | null;
  @ApiProperty({ enum: Role, isArray: true }) pendingRoles!: Role[];
  @ApiProperty({ type: [LaunchBlockerDto] })
  launchBlockers!: LaunchBlockerDto[];
}
export class OfferEventResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) actorId!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) data!: Record<
    string,
    unknown
  >;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
export class SubmitResponseDto {
  @ApiProperty({ type: OfferResponseDto }) offer!: OfferResponseDto;
  @ApiProperty({ type: RoundResponseDto }) round!: RoundResponseDto;
  @ApiProperty({ type: RevisionResponseDto }) revision!: RevisionResponseDto;
}
export class ReviewResultDto {
  @ApiProperty({ type: ReviewResponseDto }) review!: ReviewResponseDto;
  @ApiProperty({ enum: OfferStatus }) status!: OfferStatus;
}
