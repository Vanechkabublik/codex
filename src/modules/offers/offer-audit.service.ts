import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OfferEvent } from './entities/offer-event.entity';
@Injectable()
export class OfferAuditService {
  async record(
    manager: EntityManager,
    offerId: string,
    actorId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await manager.save(
      OfferEvent,
      manager.create(OfferEvent, { offerId, actorId, type, data }),
    );
  }
}
