import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Actor } from '../../common/decorators/auth.decorators';
import { PaginationDto, pageResult } from '../../common/dto/pagination.dto';
import { REVIEWER_ROLES } from '../users/role.enum';
import { OfferAccessService } from '../offers/offer-access.service';
import { OfferStatus, ReviewDecision } from '../offers/offer.enums';
import { ApprovalRound } from './entities/approval-round.entity';
import { Review } from './entities/review.entity';
import { offerResponse, roundResponse } from '../offers/offer.mapper';
@Injectable()
export class ApprovalQueryService {
  constructor(
    private readonly db: DataSource,
    private readonly access: OfferAccessService,
  ) {}
  async current(id: string, actor: Actor) {
    const offer = await this.access.get(id, actor);
    const round = offer.roundNumber
      ? await this.db.getRepository(ApprovalRound).findOne({
          where: { offerId: id, number: offer.roundNumber },
          relations: { revision: true },
        })
      : null;
    const reviews = round
      ? await this.db.getRepository(Review).find({
          where: { roundId: round.id },
          order: { createdAt: 'ASC', id: 'ASC' },
        })
      : [];
    const pendingRoles = REVIEWER_ROLES.filter(
      (role) => !reviews.some((review) => review.reviewerRole === role),
    );
    const blockers: { code: string; message: string; role?: string }[] = [];
    if (!round)
      blockers.push({
        code: 'NOT_SUBMITTED',
        message: 'Offer has not been submitted',
      });
    for (const role of pendingRoles)
      blockers.push({
        code: 'MISSING_REVIEW',
        role,
        message: 'Required role has not decided',
      });
    for (const review of reviews.filter(
      (item) => item.decision !== ReviewDecision.APPROVED,
    ))
      blockers.push({
        code: review.decision,
        role: review.reviewerRole,
        message: review.comment,
      });
    if (offer.status === OfferStatus.APPROVED)
      blockers.push({
        code: 'FINAL_CHECK_REQUIRED',
        message: 'Call ready-to-launch after final checks',
      });
    if (offer.endsAt && offer.endsAt.getTime() <= Date.now())
      blockers.push({
        code: 'OFFER_EXPIRED',
        message: 'Offer validity has ended',
      });
    return {
      ...offerResponse(offer),
      currentRound: round ? roundResponse(round, reviews) : null,
      pendingRoles,
      launchBlockers: blockers,
    };
  }
  async rounds(id: string, query: PaginationDto, actor: Actor) {
    await this.access.get(id, actor);
    const [items, total] = await this.db
      .getRepository(ApprovalRound)
      .findAndCount({
        where: { offerId: id },
        relations: { revision: true },
        order: { number: 'DESC' },
        take: query.limit,
        skip: query.skip,
      });
    // One batched query for all review lists on this page.
    const reviews = items.length
      ? await this.db
          .getRepository(Review)
          .createQueryBuilder('review')
          .where('review.roundId IN (:...ids)', {
            ids: items.map((round) => round.id),
          })
          .orderBy('review.createdAt', 'ASC')
          .getMany()
      : [];
    return pageResult(
      items.map((round) =>
        roundResponse(
          round,
          reviews.filter((review) => review.roundId === round.id),
        ),
      ),
      total,
      query,
    );
  }
  async reviews(id: string, roundId: string, actor: Actor) {
    await this.access.get(id, actor);
    if (
      !(await this.db
        .getRepository(ApprovalRound)
        .existsBy({ id: roundId, offerId: id }))
    )
      throw new NotFoundException('Round not found');
    return this.db
      .getRepository(Review)
      .find({ where: { roundId }, order: { createdAt: 'ASC', id: 'ASC' } });
  }
}
