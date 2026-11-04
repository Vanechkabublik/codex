import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest, ROLES_KEY } from '../decorators/auth.decorators';
import { Role } from '../../modules/users/role.enum';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles) return true;
    if (
      !roles.includes(
        context.switchToHttp().getRequest<AuthenticatedRequest>().user.role,
      )
    )
      throw new ForbiddenException('Role is not allowed');
    return true;
  }
}
