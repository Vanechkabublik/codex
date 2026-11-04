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
import { User } from '../../users/entities/user.entity';
import { Role } from '../../users/role.enum';
import { ReviewDecision } from '../../offers/offer.enums';
import { ApprovalRound } from './approval-round.entity';
@Entity('reviews')
@Index(['roundId', 'reviewerRole'], { unique: true })
@Check(
  "\"reviewerRole\" IN ('PRODUCT_MANAGER', 'ANALYST', 'OPERATIONS_MANAGER')",
)
@Check('length(btrim("comment")) > 0')
export class Review extends BaseEntity {
  @Column('uuid') roundId!: string;
  @ManyToOne(() => ApprovalRound, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roundId' })
  round!: Relation<ApprovalRound>;
  @Index()
  @Column('uuid')
  reviewerId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer!: Relation<User>;
  @Column({ type: 'enum', enum: Role, enumName: 'user_role' })
  reviewerRole!: Role;
  @Column({ type: 'enum', enum: ReviewDecision, enumName: 'review_decision' })
  decision!: ReviewDecision;
  @Column({ type: 'text' }) comment!: string;
}
