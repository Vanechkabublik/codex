import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
  VersionColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { OfferStatus, OfferType } from '../offer.enums';
@Entity('offers')
@Index(['status', 'startsAt', 'endsAt'])
@Check(
  '"payoutSpent" >= 0 AND ("payoutLimit" IS NULL OR "payoutSpent" <= "payoutLimit")',
)
@Check(
  '"cashbackPercent" IS NULL OR ("cashbackPercent" > 0 AND "cashbackPercent" <= 100)',
)
@Check('"payoutLimit" IS NULL OR "payoutLimit" > 0')
@Check('"startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt"')
export class Offer extends BaseEntity {
  @Index()
  @Column('uuid')
  ownerId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner!: Relation<User>;
  @Column({ type: 'varchar', length: 200, nullable: true }) title!:
    string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) category!:
    string | null;
  @Column({
    type: 'enum',
    enum: OfferType,
    enumName: 'offer_type',
    nullable: true,
  })
  type!: OfferType | null;
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  cashbackPercent!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) startsAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) endsAt!: Date | null;
  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  payoutLimit!: string | null;
  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0' })
  payoutSpent!: string;
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  mccCodes!: string[];
  @Column({ type: 'text', nullable: true }) clientDescription!: string | null;
  @Column({
    type: 'enum',
    enum: OfferStatus,
    enumName: 'offer_status',
    default: OfferStatus.DRAFT,
  })
  status!: OfferStatus;
  @Column({ type: 'integer', default: 0 }) roundNumber!: number;
  @VersionColumn() version!: number;
}
