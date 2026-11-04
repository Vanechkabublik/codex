import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Offer } from './offer.entity';
@Entity('offer_events')
@Index(['offerId', 'createdAt'])
export class OfferEvent extends BaseEntity {
  @Column('uuid') offerId!: string;
  @ManyToOne(() => Offer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offerId' })
  offer!: Relation<Offer>;
  @Column('uuid') actorId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actorId' })
  actor!: Relation<User>;
  @Column({ type: 'varchar', length: 60 }) type!: string;
  @Column('jsonb') data!: Record<string, unknown>;
}
