import { Offer } from './entities/offer.entity';
import { OfferRevision } from './entities/offer-revision.entity';
import { ApprovalRound } from '../approvals/entities/approval-round.entity';
import { Review } from '../approvals/entities/review.entity';

export function offerResponse(offer: Offer) {
  return {
    id: offer.id,
    ownerId: offer.ownerId,
    title: offer.title,
    category: offer.category,
    type: offer.type,
    cashbackPercent: offer.cashbackPercent,
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
    payoutLimit: offer.payoutLimit,
    payoutSpent: offer.payoutSpent,
    mccCodes: offer.mccCodes,
    clientDescription: offer.clientDescription,
    status: offer.status,
    roundNumber: offer.roundNumber,
    version: offer.version,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}
export function revisionResponse(revision: OfferRevision) {
  return {
    id: revision.id,
    offerId: revision.offerId,
    number: revision.number,
    authorId: revision.authorId,
    snapshot: revision.snapshot,
    createdAt: revision.createdAt,
  };
}
export function roundResponse(round: ApprovalRound, reviews: Review[]) {
  return {
    id: round.id,
    offerId: round.offerId,
    revisionId: round.revisionId,
    number: round.number,
    closedAt: round.closedAt,
    createdAt: round.createdAt,
    revision: revisionResponse(round.revision),
    reviews,
  };
}
