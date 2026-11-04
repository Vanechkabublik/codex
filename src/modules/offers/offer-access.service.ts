import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Actor } from '../../common/decorators/auth.decorators';
import { Role } from '../users/role.enum';
import { Offer } from './entities/offer.entity';
import { assertOwnership } from './offer.policy';
@Injectable()
export class OfferAccessService {
  constructor(private readonly db: DataSource) {}
  async get(
    id: string,
    actor: Actor,
    manager: EntityManager = this.db.manager,
    lock = false,
  ): Promise<Offer> {
    const offer = await manager.findOne(Offer, {
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (actor.role === Role.OFFER_OWNER) assertOwnership(offer, actor);
    return offer;
  }
}
