import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as argon2 from 'argon2';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { userResponse } from '../users/dto/user-response.dto';
import { LoginDto } from './dto/auth.dto';
import { RefreshSession } from './entities/refresh-session.entity';
import { TokenService, TokenClaims } from './token.service';
@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly db: DataSource,
  ) {}
  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash(randomBytes(32), {
      type: argon2.argon2id,
    });
  }
  async login(dto: LoginDto) {
    const user = await this.users.findForLogin(dto.email);
    const valid = await argon2.verify(
      user?.passwordHash ?? this.dummyHash,
      dto.password,
    );
    if (!valid || !user)
      throw new UnauthorizedException('Invalid email or password');
    return this.db.transaction(async (manager) => {
      const id = randomUUID();
      const pair = await this.tokens.issue(user.id, id);
      await manager.save(
        RefreshSession,
        manager.create(RefreshSession, {
          id,
          userId: user.id,
          tokenHash: this.tokens.hash(pair.refreshToken),
          expiresAt: new Date(Date.now() + this.tokens.refreshTtl * 1000),
          revokedAt: null,
        }),
      );
      return { ...pair, user: userResponse(user) };
    });
  }
  async refresh(token: string) {
    const claims = await this.tokens.verify(token, 'refresh');
    return this.db.transaction(async (manager) => {
      const session = await this.lockSession(manager, claims, token);
      const user = await manager.findOneByOrFail(User, { id: claims.sub });
      const pair = await this.tokens.issue(user.id, session.id);
      session.tokenHash = this.tokens.hash(pair.refreshToken);
      session.expiresAt = new Date(Date.now() + this.tokens.refreshTtl * 1000);
      await manager.save(session);
      return { ...pair, user: userResponse(user) };
    });
  }
  async logout(token: string): Promise<void> {
    const claims = await this.tokens.verify(token, 'refresh');
    await this.db.transaction(async (manager) => {
      const session = await this.lockSession(manager, claims, token);
      session.revokedAt = new Date();
      await manager.save(session);
    });
  }
  private async lockSession(
    manager: EntityManager,
    claims: TokenClaims,
    token: string,
  ): Promise<RefreshSession> {
    const session = await manager
      .getRepository(RefreshSession)
      .createQueryBuilder('session')
      .addSelect('session.tokenHash')
      .setLock('pessimistic_write')
      .where('session.id = :id AND session.userId = :userId', {
        id: claims.sid,
        userId: claims.sub,
      })
      .getOne();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !timingSafeEqual(
        Buffer.from(session.tokenHash, 'hex'),
        Buffer.from(this.tokens.hash(token), 'hex'),
      )
    ) {
      throw new UnauthorizedException('Refresh session is invalid');
    }
    return session;
  }
}
