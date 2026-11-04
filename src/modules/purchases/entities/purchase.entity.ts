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
import { Offer } from '../../offers/entities/offer.entity';
@Entity('purchases')
@Index(['clientId', 'reference'], { unique: true })
@Index(['clientId', 'createdAt'])
@Check('"amount" > 0')
@Check('"mcc" ~ \'^[0-9]{4}$\'')
export class Purchase extends BaseEntity {
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
  @Column({ type: 'varchar', length: 100 }) reference!: string;
  @Column({ type: 'numeric', precision: 18, scale: 2 }) amount!: string;
  @Column({ type: 'varchar', length: 4 }) mcc!: string;
  @Column('timestamptz') purchasedAt!: Date;
}
