/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GuestJwtGuard } from './guest-auth.guard';

//new implementation
@Injectable()
export class EitherAuthGuard implements CanActivate {
  constructor(
    private readonly userGuard: JwtAuthGuard,
    private readonly guestGuard: GuestJwtGuard,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Try user first
    try {
      const ok = await Promise.resolve(this.userGuard.canActivate(ctx) as any);
      if (ok) return true;
    } catch {
      // ignore and try guest
    }

    // Try guest
    try {
      const ok = await Promise.resolve(this.guestGuard.canActivate(ctx) as any);
      if (ok) return true;
    } catch {
      // ignore
    }

    throw new UnauthorizedException('Not authenticated');
  }
}
