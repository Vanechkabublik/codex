import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { OfferRevision } from '../../offers/entities/offer-revision.entity';
@Entity('approval_rounds')
@Index(['offerId', 'number'], { unique: true })
@Index('one_open_round_per_offer', ['offerId'], {
  unique: true,
  where: '"closedAt" IS NULL',
})
export class ApprovalRound extends BaseEntity {
  @Column('uuid') offerId!: string;
  @ManyToOne(() => Offer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offerId' })
  offer!: Relation<Offer>;
  @Index({ unique: true })
  @Column('uuid')
  revisionId!: string;
  @ManyToOne(() => OfferRevision, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'revisionId' })
  revision!: Relation<OfferRevision>;
  @Column('int') number!: number;
  @Column({ type: 'timestamptz', nullable: true }) closedAt!: Date | null;
}
