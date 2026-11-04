import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { OfferRevision } from '../../offers/entities/offer-revision.entity';
import { CashbackReason, EvaluationResult } from '../cashback.enums';
@Entity('cashback_evaluations')
@Check(
  'evaluation_outcome_consistent',
  `(result = 'ACCRUED' AND reason IS NULL AND explanation IS NULL AND amount > 0 AND "revisionId" IS NOT NULL) OR (result = 'DECLINED' AND reason IS NOT NULL AND explanation IS NOT NULL AND amount = 0)`,
)
export class CashbackEvaluation extends BaseEntity {
  @Index({ unique: true })
  @Column('uuid')
  purchaseId!: string;
  @ManyToOne(() => Purchase, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchaseId' })
  purchase!: Relation<Purchase>;
  @Index()
  @Column('uuid')
  offerId!: string;
  @ManyToOne(() => Offer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offerId' })
  offer!: Relation<Offer>;
  @Column({ type: 'uuid', nullable: true }) revisionId!: string | null;
  @ManyToOne(() => OfferRevision, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'revisionId' })
  revision!: Relation<OfferRevision> | null;
  @Column({
    type: 'enum',
    enum: EvaluationResult,
    enumName: 'evaluation_result',
  })
  result!: EvaluationResult;
  @Column({
    type: 'enum',
    enum: CashbackReason,
    enumName: 'cashback_reason',
    nullable: true,
  })
  reason!: CashbackReason | null;
  @Column({ type: 'text', nullable: true }) explanation!: string | null;
  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0' })
  amount!: string;
}
