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
import { CashbackEvaluation } from './cashback-evaluation.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
@Entity('cashback_accruals')
@Check('"amount" > 0')
export class CashbackAccrual extends BaseEntity {
  @Index({ unique: true })
  @Column('uuid')
  evaluationId!: string;
  @ManyToOne(() => CashbackEvaluation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'evaluationId' })
  evaluation!: Relation<CashbackEvaluation>;
  @Index({ unique: true })
  @Column('uuid')
  purchaseId!: string;
  @ManyToOne(() => Purchase, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchaseId' })
  purchase!: Relation<Purchase>;
  @Column({ type: 'numeric', precision: 18, scale: 2 }) amount!: string;
}
