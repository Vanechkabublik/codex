import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { Actor } from '../../common/decorators/auth.decorators';
import { Role, REVIEWER_ROLES } from '../users/role.enum';
import { Offer } from './entities/offer.entity';
import { SaveOfferDto } from './dto/offer.dto';
import { OfferSnapshot, OfferStatus, ReviewDecision } from './offer.enums';
export function assertOwnership(offer: Offer, actor: Actor): void {
  if (actor.role !== Role.ADMIN && offer.ownerId !== actor.id)
    throw new ForbiddenException('Offer belongs to another owner');
}
export function assertEditable(offer: Offer): void {
  if (
    ![OfferStatus.DRAFT, OfferStatus.CHANGES_REQUESTED].includes(offer.status)
  )
    throw new ConflictException('Offer cannot be edited in its current state');
}
export function applyOfferChanges(offer: Offer, dto: SaveOfferDto): void {
  if (dto.title !== undefined) offer.title = dto.title;
  if (dto.category !== undefined) offer.category = dto.category;
  if (dto.type !== undefined) offer.type = dto.type;
  if (dto.clientDescription !== undefined)
    offer.clientDescription = dto.clientDescription;
  if (dto.cashbackPercent !== undefined)
    offer.cashbackPercent = new Decimal(dto.cashbackPercent).toFixed(2);
  if (dto.payoutLimit !== undefined)
    offer.payoutLimit = new Decimal(dto.payoutLimit).toFixed(2);
  if (dto.startsAt !== undefined) offer.startsAt = new Date(dto.startsAt);
  if (dto.endsAt !== undefined) offer.endsAt = new Date(dto.endsAt);
  if (dto.mccCodes !== undefined) offer.mccCodes = [...dto.mccCodes];
  validateDraft(offer);
}
export function validateDraft(offer: Offer): void {
  if (
    offer.cashbackPercent !== null &&
    (!new Decimal(offer.cashbackPercent).gt(0) ||
      new Decimal(offer.cashbackPercent).gt(100))
  )
    throw new BadRequestException('cashbackPercent must be > 0 and <= 100');
  if (offer.payoutLimit !== null && !new Decimal(offer.payoutLimit).gt(0))
    throw new BadRequestException('payoutLimit must be positive');
  if (offer.startsAt && offer.endsAt && offer.endsAt <= offer.startsAt)
    throw new BadRequestException('endsAt must be after startsAt');
}
export function businessData(offer: Offer) {
  return {
    title: offer.title,
    category: offer.category,
    type: offer.type,
    cashbackPercent: offer.cashbackPercent,
    startsAt: offer.startsAt?.toISOString() ?? null,
    endsAt: offer.endsAt?.toISOString() ?? null,
    payoutLimit: offer.payoutLimit,
    mccCodes: offer.mccCodes,
    clientDescription: offer.clientDescription,
  };
}
export function completeSnapshot(offer: Offer): OfferSnapshot {
  validateDraft(offer);
  if (
    !offer.title?.trim() ||
    !offer.category?.trim() ||
    !offer.type ||
    !offer.cashbackPercent ||
    !offer.startsAt ||
    !offer.endsAt ||
    !offer.payoutLimit ||
    !offer.mccCodes.length ||
    !offer.clientDescription?.trim()
  ) {
    throw new BadRequestException(
      'Offer is incomplete: title, category, type, cashbackPercent, startsAt, endsAt, payoutLimit, mccCodes and clientDescription are required',
    );
  }
  return {
    title: offer.title,
    category: offer.category,
    type: offer.type,
    cashbackPercent: offer.cashbackPercent,
    startsAt: offer.startsAt.toISOString(),
    endsAt: offer.endsAt.toISOString(),
    payoutLimit: offer.payoutLimit,
    mccCodes: [...offer.mccCodes],
    clientDescription: offer.clientDescription,
  };
}
export function aggregateStatus(
  reviews: readonly { reviewerRole: Role; decision: ReviewDecision }[],
): OfferStatus {
  if (reviews.some((review) => review.decision === ReviewDecision.REJECTED))
    return OfferStatus.REJECTED;
  if (
    reviews.some(
      (review) => review.decision === ReviewDecision.CHANGES_REQUESTED,
    )
  )
    return OfferStatus.CHANGES_REQUESTED;
  if (
    REVIEWER_ROLES.every((role) =>
      reviews.some(
        (review) =>
          review.reviewerRole === role &&
          review.decision === ReviewDecision.APPROVED,
      ),
    )
  )
    return OfferStatus.APPROVED;
  return reviews.length
    ? OfferStatus.PARTIALLY_APPROVED
    : OfferStatus.UNDER_REVIEW;
}
