/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';

//new implementation

@Injectable()
export class GuestJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();

    const token = (req.headers['x-guest-token'] as string | undefined)?.trim();
    if (!token) throw new UnauthorizedException('Missing guest token');

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET!,
      });

      const session = await this.authService.validateGuestTokenPayload(payload);

      req.guest = {
        guestId: session.guestId,
        // sessionId: session._id.toString(),
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired guest token');
    }
  }
}
