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
@Entity('refresh_sessions')
export class RefreshSession extends BaseEntity {
  @Index()
  @Column('uuid')
  userId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<User>;
  @Column({ type: 'varchar', length: 64, select: false }) tokenHash!: string;
  @Column('timestamptz') expiresAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
}
