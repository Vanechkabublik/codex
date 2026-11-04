import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../modules/users/role.enum';
export interface Actor {
  id: string;
  email: string;
  role: Role;
}
export interface AuthenticatedRequest extends Request {
  user: Actor;
}
export const PUBLIC_KEY = 'public';
export const ROLES_KEY = 'roles';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
