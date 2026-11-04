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
import { Offer } from '../../offers/entities/offer.entity';
@Entity('offer_activations')
@Index(['clientId', 'offerId'], { unique: true })
export class OfferActivation extends BaseEntity {
  @Column('uuid') clientId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client!: Relation<User>;
  @Index()
  @Column('uuid')
  offerId!: string;
  @ManyToOne(() => Offer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'offerId' })
  offer!: Relation<Offer>;
}
