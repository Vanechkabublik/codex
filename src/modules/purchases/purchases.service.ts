import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { Actor } from '../../common/decorators/auth.decorators';
import { PaginationDto, pageResult } from '../../common/dto/pagination.dto';
import { Role } from '../users/role.enum';
import { Offer } from '../offers/entities/offer.entity';
import { CashbackService } from '../cashback/cashback.service';
import { CashbackEvaluation } from '../cashback/entities/cashback-evaluation.entity';
import { CashbackAccrual } from '../cashback/entities/cashback-accrual.entity';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { Purchase } from './entities/purchase.entity';
@Injectable()
export class PurchasesService {
  constructor(
    private readonly db: DataSource,
    private readonly cashback: CashbackService,
  ) {}
  async create(dto: CreatePurchaseDto, actor: Actor) {
    const amount = new Decimal(dto.amount);
    if (!amount.gt(0))
      throw new BadRequestException('Purchase amount must be positive');
    const purchasedAt = new Date(dto.purchasedAt);
    if (purchasedAt.getTime() > Date.now())
      throw new BadRequestException('purchasedAt cannot be in the future');
    return this.db.transaction(async (manager) => {
      // Serializes identical references before insert, including requests for different offers.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        actor.id + ':' + dto.reference,
      ]);
      const existing = await manager.findOneBy(Purchase, {
        clientId: actor.id,
        reference: dto.reference,
      });
      if (existing) {
        if (
          existing.offerId !== dto.offerId ||
          !new Decimal(existing.amount).eq(amount) ||
          existing.mcc !== dto.mcc ||
          existing.purchasedAt.getTime() !== purchasedAt.getTime()
        )
          throw new ConflictException(
            'Reference was already used with different purchase data',
          );
        return this.result(manager, existing);
      }
      const offer = await manager.findOne(Offer, {
        where: { id: dto.offerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!offer) throw new NotFoundException('Offer not found');
      const purchase = await manager.save(
        Purchase,
        manager.create(Purchase, {
          clientId: actor.id,
          offerId: dto.offerId,
          reference: dto.reference,
          amount: amount.toFixed(2),
          mcc: dto.mcc,
          purchasedAt,
        }),
      );
      const outcome = await this.cashback.process(manager, purchase, offer);
      return { purchase, ...outcome };
    });
  }
  async get(id: string, actor: Actor) {
    const purchase = await this.db.getRepository(Purchase).findOneBy({ id });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (actor.role !== Role.ADMIN && purchase.clientId !== actor.id)
      throw new ForbiddenException('Purchase belongs to another client');
    return this.result(this.db.manager, purchase);
  }
  async list(actor: Actor, query: PaginationDto) {
    const [items, total] = await this.db.getRepository(Purchase).findAndCount({
      where: actor.role === Role.ADMIN ? {} : { clientId: actor.id },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: query.limit,
      skip: query.skip,
    });
    return pageResult(items, total, query);
  }
  private async result(manager: EntityManager, purchase: Purchase) {
    const evaluation = await manager.findOneByOrFail(CashbackEvaluation, {
      purchaseId: purchase.id,
    });
    const accrual = await manager.findOneBy(CashbackAccrual, {
      purchaseId: purchase.id,
    });
    return { purchase, evaluation, accrual };
  }
}
