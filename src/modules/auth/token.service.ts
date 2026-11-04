import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { createHash, randomUUID } from 'node:crypto';
import { EnvironmentVariables } from '../../config/environment.validation';
export interface TokenClaims {
  sub: string;
  sid: string;
  kind: 'access' | 'refresh';
}
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}
  get accessTtl(): number {
    return this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }
  get refreshTtl(): number {
    return this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true });
  }
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  async issue(userId: string, sessionId: string) {
    const claims = { sub: userId, sid: sessionId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...claims, kind: 'access' },
        this.signOptions('access'),
      ),
      this.jwt.signAsync(
        { ...claims, kind: 'refresh' },
        this.signOptions('refresh'),
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtl,
    };
  }
  async verify(
    token: string,
    kind: 'access' | 'refresh',
  ): Promise<TokenClaims> {
    let claims: Record<string, unknown>;
    try {
      claims = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.secret(kind),
        algorithms: ['HS256'],
        issuer: 'cashback-api',
        audience: kind,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (
      claims.kind !== kind ||
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      !isUUID(claims.sub) ||
      !isUUID(claims.sid)
    ) {
      throw new UnauthorizedException('Invalid token claims');
    }
    return { sub: claims.sub, sid: claims.sid, kind };
  }
  private secret(kind: 'access' | 'refresh'): string {
    return this.config.get(
      kind === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
      { infer: true },
    );
  }
  private signOptions(kind: 'access' | 'refresh') {
    return {
      secret: this.secret(kind),
      algorithm: 'HS256' as const,
      issuer: 'cashback-api',
      audience: kind,
      expiresIn: kind === 'access' ? this.accessTtl : this.refreshTtl,
      jwtid: randomUUID(),
    };
  }
}
