import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaginationDto, pageResult } from '../../common/dto/pagination.dto';
import { Offer } from '../offers/entities/offer.entity';
import {
  StorefrontService,
  clientOffer,
} from '../storefront/storefront.service';
import { OfferActivation } from './entities/offer-activation.entity';
@Injectable()
export class ActivationsService {
  constructor(
    private readonly db: DataSource,
    private readonly storefront: StorefrontService,
  ) {}
  async activate(offerId: string, clientId: string): Promise<OfferActivation> {
    return this.db.transaction(async (manager) => {
      const offer = await manager.findOne(Offer, {
        where: { id: offerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!offer) throw new NotFoundException('Offer not found');
      const existing = await manager.findOneBy(OfferActivation, {
        offerId,
        clientId,
      });
      if (existing) return existing;
      const eligible = await this.storefront.eligible(manager);
      if (!eligible.some((item) => item.id === offerId))
        throw new ConflictException(
          'Offer is not available in your storefront',
        );
      return manager.save(
        OfferActivation,
        manager.create(OfferActivation, { offerId, clientId }),
      );
    });
  }
  async list(clientId: string, query: PaginationDto) {
    const [items, total] = await this.db
      .getRepository(OfferActivation)
      .findAndCount({
        where: { clientId },
        relations: { offer: true },
        order: { createdAt: 'DESC', id: 'ASC' },
        take: query.limit,
        skip: query.skip,
      });
    return pageResult(
      items.map((item) => ({
        id: item.id,
        clientId: item.clientId,
        offerId: item.offerId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        offer: clientOffer(item.offer, true),
      })),
      total,
      query,
    );
  }
}
