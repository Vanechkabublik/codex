import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PUBLIC_KEY,
  AuthenticatedRequest,
} from '../decorators/auth.decorators';
import { JwtAccessStrategy } from '../../modules/auth/strategies/jwt-access.strategy';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly strategy: JwtAccessStrategy,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token, extra] =
      request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || extra)
      throw new UnauthorizedException('Bearer access token required');
    request.user = await this.strategy.authenticate(token);
    return true;
  }
}
