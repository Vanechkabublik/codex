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
import { OfferSnapshot } from '../offer.enums';
import { Offer } from './offer.entity';
@Entity('offer_revisions')
@Index(['offerId', 'number'], { unique: true })
export class OfferRevision extends BaseEntity {
  @Column('uuid') offerId!: string;
  @ManyToOne(() => Offer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offerId' })
  offer!: Relation<Offer>;
  @Column('int') number!: number;
  @Column('uuid') authorId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' })
  author!: Relation<User>;
  @Column('jsonb') snapshot!: OfferSnapshot;
}
