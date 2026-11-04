import { Check, Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../role.enum';
@Entity('users')
@Check('"email" = lower("email")')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 254 })
  email!: string;
  @Column({ type: 'varchar', select: false }) passwordHash!: string;
  @Column({ type: 'enum', enum: Role, enumName: 'user_role' }) role!: Role;
}
