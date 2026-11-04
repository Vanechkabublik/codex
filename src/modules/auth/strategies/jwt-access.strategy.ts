import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import { Actor } from '../../../common/decorators/auth.decorators';
import { User } from '../../users/entities/user.entity';
import { RefreshSession } from '../entities/refresh-session.entity';
import { TokenService } from '../token.service';
@Injectable()
export class JwtAccessStrategy {
  constructor(
    private readonly tokens: TokenService,
    private readonly db: DataSource,
  ) {}
  async authenticate(token: string): Promise<Actor> {
    const claims = await this.tokens.verify(token, 'access');
    const session = await this.db.getRepository(RefreshSession).findOneBy({
      id: claims.sid,
      userId: claims.sub,
      revokedAt: IsNull(),
      expiresAt: MoreThan(new Date()),
    });
    if (!session)
      throw new UnauthorizedException('Session is no longer active');
    const user = await this.db
      .getRepository(User)
      .findOneBy({ id: claims.sub });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, role: user.role };
  }
}
