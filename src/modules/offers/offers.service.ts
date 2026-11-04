import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Actor } from '../../common/decorators/auth.decorators';
import { PaginationDto, pageResult } from '../../common/dto/pagination.dto';
import { Role } from '../users/role.enum';
import { Offer } from './entities/offer.entity';
import { OfferEvent } from './entities/offer-event.entity';
import { OfferListDto, SaveOfferDto } from './dto/offer.dto';
import { OfferStatus } from './offer.enums';
import {
  applyOfferChanges,
  assertEditable,
  assertOwnership,
  businessData,
} from './offer.policy';
import { OfferAccessService } from './offer-access.service';
import { OfferAuditService } from './offer-audit.service';
@Injectable()
export class OffersService {
  constructor(
    private readonly db: DataSource,
    private readonly access: OfferAccessService,
    private readonly audit: OfferAuditService,
  ) {}
  async create(dto: SaveOfferDto, actor: Actor): Promise<Offer> {
    return this.db.transaction(async (manager) => {
      const offer = manager.create(Offer, {
        ownerId: actor.id,
        status: OfferStatus.DRAFT,
        title: null,
        category: null,
        type: null,
        cashbackPercent: null,
        startsAt: null,
        endsAt: null,
        payoutLimit: null,
        payoutSpent: '0.00',
        mccCodes: [],
        clientDescription: null,
        roundNumber: 0,
      });
      applyOfferChanges(offer, dto);
      await manager.save(offer);
      await this.audit.record(manager, offer.id, actor.id, 'CREATED', {
        after: businessData(offer),
      });
      return offer;
    });
  }
  async update(id: string, dto: SaveOfferDto, actor: Actor): Promise<Offer> {
    return this.db.transaction(async (manager) => {
      const offer = await this.access.get(id, actor, manager, true);
      assertOwnership(offer, actor);
      assertEditable(offer);
      const before = businessData(offer);
      applyOfferChanges(offer, dto);
      await manager.save(offer);
      await this.audit.record(manager, id, actor.id, 'EDITED', {
        before,
        after: businessData(offer),
      });
      return offer;
    });
  }
  async list(query: OfferListDto, actor: Actor) {
    const [items, total] = await this.db.getRepository(Offer).findAndCount({
      where: {
        ...(actor.role === Role.OFFER_OWNER ? { ownerId: actor.id } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: query.limit,
      skip: query.skip,
    });
    return pageResult(items, total, query);
  }
  async history(id: string, query: PaginationDto, actor: Actor) {
    await this.access.get(id, actor);
    const [items, total] = await this.db
      .getRepository(OfferEvent)
      .findAndCount({
        where: { offerId: id },
        order: { createdAt: 'DESC', id: 'ASC' },
        take: query.limit,
        skip: query.skip,
      });
    return pageResult(items, total, query);
  }
}
