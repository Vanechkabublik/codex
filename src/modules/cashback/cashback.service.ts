import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { Offer } from '../offers/entities/offer.entity';
import { OfferRevision } from '../offers/entities/offer-revision.entity';
import { OfferActivation } from '../activations/entities/offer-activation.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { CashbackEvaluation } from './entities/cashback-evaluation.entity';
import { CashbackAccrual } from './entities/cashback-accrual.entity';
import { EvaluationResult } from './cashback.enums';
import { CASHBACK_EXPLANATIONS, evaluateCashback } from './cashback.policy';
@Injectable()
export class CashbackService {
  // Caller holds the offer's write lock and owns the transaction.
  async process(manager: EntityManager, purchase: Purchase, offer: Offer) {
    const revision = offer.roundNumber
      ? await manager.findOneBy(OfferRevision, {
          offerId: offer.id,
          number: offer.roundNumber,
        })
      : null;
    const activation = await manager.findOneBy(OfferActivation, {
      clientId: purchase.clientId,
      offerId: offer.id,
    });
    const outcome = evaluateCashback({
      status: offer.status,
      snapshot: revision?.snapshot ?? null,
      payoutSpent: offer.payoutSpent,
      activatedAt: activation?.createdAt ?? null,
      purchasedAt: purchase.purchasedAt,
      amount: purchase.amount,
      mcc: purchase.mcc,
    });
    const evaluation = await manager.save(
      CashbackEvaluation,
      manager.create(CashbackEvaluation, {
        purchaseId: purchase.id,
        offerId: offer.id,
        revisionId: revision?.id ?? null,
        result: outcome.reason
          ? EvaluationResult.DECLINED
          : EvaluationResult.ACCRUED,
        reason: outcome.reason,
        explanation: outcome.reason
          ? CASHBACK_EXPLANATIONS[outcome.reason]
          : null,
        amount: outcome.amount,
      }),
    );
    let accrual: CashbackAccrual | null = null;
    if (!outcome.reason) {
      accrual = await manager.save(
        CashbackAccrual,
        manager.create(CashbackAccrual, {
          purchaseId: purchase.id,
          evaluationId: evaluation.id,
          amount: outcome.amount,
        }),
      );
      offer.payoutSpent = new Decimal(offer.payoutSpent)
        .plus(outcome.amount)
        .toFixed(2);
      await manager.save(offer);
    }
    return { evaluation, accrual };
  }
}
