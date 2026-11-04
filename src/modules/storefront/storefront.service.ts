import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Offer } from '../offers/entities/offer.entity';
import { OfferStatus, OfferType } from '../offers/offer.enums';
import { OfferActivation } from '../activations/entities/offer-activation.entity';
export function clientOffer(offer: Offer, activated: boolean) {
  return {
    id: offer.id,
    title: offer.title,
    category: offer.category,
    type: offer.type,
    cashbackPercent: offer.cashbackPercent,
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
    mccCodes: offer.mccCodes,
    clientDescription: offer.clientDescription,
    activated,
  };
}
@Injectable()
export class StorefrontService {
  constructor(private readonly db: DataSource) {}
  eligible(
    manager: EntityManager = this.db.manager,
    now = new Date(),
  ): Promise<Offer[]> {
    return manager
      .getRepository(Offer)
      .createQueryBuilder('offer')
      .where('offer.status = :status', { status: OfferStatus.READY_TO_LAUNCH })
      .andWhere('offer.startsAt <= :now AND offer.endsAt > :now', { now })
      .andWhere('offer.payoutSpent < offer.payoutLimit')
      .orderBy('CASE WHEN offer.type = :partner THEN 0 ELSE 1 END', 'ASC')
      .setParameter('partner', OfferType.PARTNER)
      .addOrderBy('offer.endsAt', 'ASC')
      .addOrderBy('offer.id', 'ASC')
      .take(7)
      .getMany();
  }
  async get(clientId: string) {
    const offers = await this.eligible();
    const activeIds = offers.length
      ? await this.db
          .getRepository(OfferActivation)
          .createQueryBuilder('activation')
          .where(
            'activation.clientId = :clientId AND activation.offerId IN (:...ids)',
            { clientId, ids: offers.map((offer) => offer.id) },
          )
          .getMany()
      : [];
    const active = new Set(activeIds.map((item) => item.offerId));
    return {
      offers: offers.map((offer) => clientOffer(offer, active.has(offer.id))),
      baseCategory: {
        code: 'BASE_CASHBACK',
        title: '1% на всё',
        cashbackPercent: '1.00',
      },
    };
  }
}
