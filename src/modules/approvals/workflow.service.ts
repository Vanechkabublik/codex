import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { Actor } from '../../common/decorators/auth.decorators';
import { REVIEWER_ROLES } from '../users/role.enum';
import { Offer } from '../offers/entities/offer.entity';
import { OfferRevision } from '../offers/entities/offer-revision.entity';
import { OfferStatus } from '../offers/offer.enums';
import {
  aggregateStatus,
  assertEditable,
  assertOwnership,
  completeSnapshot,
} from '../offers/offer.policy';
import { OfferAccessService } from '../offers/offer-access.service';
import { OfferAuditService } from '../offers/offer-audit.service';
import { ApprovalRound } from './entities/approval-round.entity';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/review.dto';
import { roundResponse } from '../offers/offer.mapper';
@Injectable()
export class WorkflowService {
  constructor(
    private readonly db: DataSource,
    private readonly access: OfferAccessService,
    private readonly audit: OfferAuditService,
  ) {}
  async submit(id: string, actor: Actor) {
    return this.db.transaction(async (manager) => {
      const offer = await this.access.get(id, actor, manager, true);
      assertOwnership(offer, actor);
      assertEditable(offer);
      const snapshot = completeSnapshot(offer);
      if (offer.roundNumber > 0)
        await manager.update(
          ApprovalRound,
          { offerId: id, number: offer.roundNumber, closedAt: IsNull() },
          { closedAt: new Date() },
        );
      offer.roundNumber += 1;
      const revision = await manager.save(
        OfferRevision,
        manager.create(OfferRevision, {
          offerId: id,
          number: offer.roundNumber,
          authorId: actor.id,
          snapshot,
        }),
      );
      const round = await manager.save(
        ApprovalRound,
        manager.create(ApprovalRound, {
          offerId: id,
          revisionId: revision.id,
          number: offer.roundNumber,
          closedAt: null,
        }),
      );
      const previousStatus = offer.status;
      offer.status = OfferStatus.UNDER_REVIEW;
      await manager.save(offer);
      await this.audit.record(manager, id, actor.id, 'SUBMITTED', {
        roundId: round.id,
        number: round.number,
        revisionId: revision.id,
        previousStatus,
        status: offer.status,
      });
      round.revision = revision;
      return { offer, round: roundResponse(round, []), revision };
    });
  }
  async review(
    id: string,
    roundId: string,
    dto: CreateReviewDto,
    actor: Actor,
  ) {
    if (!REVIEWER_ROLES.includes(actor.role))
      throw new ForbiddenException('Only a required reviewer role can decide');
    return this.db.transaction(async (manager) => {
      const offer = await this.access.get(id, actor, manager, true);
      const round = await manager.findOneBy(ApprovalRound, {
        id: roundId,
        offerId: id,
        number: offer.roundNumber,
      });
      if (!round || round.closedAt)
        throw new ConflictException(
          'Approval round is not open or is no longer current',
        );
      if (await manager.existsBy(Review, { roundId, reviewerRole: actor.role }))
        throw new ConflictException(
          'This role has already decided in this round',
        );
      const review = await manager.save(
        Review,
        manager.create(Review, {
          roundId,
          reviewerId: actor.id,
          reviewerRole: actor.role,
          decision: dto.decision,
          comment: dto.comment,
        }),
      );
      const reviews = await manager.findBy(Review, { roundId });
      const previousStatus = offer.status;
      offer.status = aggregateStatus(reviews);
      if (
        reviews.length === REVIEWER_ROLES.length ||
        offer.status === OfferStatus.REJECTED
      ) {
        round.closedAt = new Date();
        await manager.save(round);
      }
      await manager.save(offer);
      await this.audit.record(manager, id, actor.id, 'REVIEWED', {
        reviewId: review.id,
        roundId,
        reviewerRole: actor.role,
        decision: dto.decision,
        comment: dto.comment,
        previousStatus,
        status: offer.status,
      });
      if (
        previousStatus !== offer.status &&
        offer.status === OfferStatus.CHANGES_REQUESTED
      ) {
        await this.audit.record(manager, id, actor.id, 'CHANGES_REQUESTED', {
          roundId,
          comment: dto.comment,
        });
      }
      return { review, status: offer.status };
    });
  }
  async ready(id: string, actor: Actor): Promise<Offer> {
    return this.db.transaction(async (manager) => {
      const offer = await this.access.get(id, actor, manager, true);
      assertOwnership(offer, actor);
      if (offer.status !== OfferStatus.APPROVED)
        throw new ConflictException(
          'All three approvals are required before launch',
        );
      const snapshot = completeSnapshot(offer);
      if (new Date(snapshot.endsAt).getTime() <= Date.now())
        throw new ConflictException('Offer is expired');
      const round = await manager.findOneByOrFail(ApprovalRound, {
        offerId: id,
        number: offer.roundNumber,
      });
      const reviews = await manager.findBy(Review, { roundId: round.id });
      if (aggregateStatus(reviews) !== OfferStatus.APPROVED)
        throw new ConflictException('Current round is not fully approved');
      offer.status = OfferStatus.READY_TO_LAUNCH;
      await manager.save(offer);
      await this.audit.record(manager, id, actor.id, 'READY_TO_LAUNCH', {
        roundId: round.id,
        status: offer.status,
      });
      return offer;
    });
  }
}
