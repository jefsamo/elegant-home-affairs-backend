// src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        'You are not allowed to perform this action!',
      );
    }

    return true;
  }
}
