// src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private getAccessToken(payload: any): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      // expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });
  }

  private getRefreshToken(payload: any): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      // expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findUserByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
    });

    await this.usersService.setPassword(user._id.toString(), passwordHash);

    // create email verification token (JWT)
    const verifyToken = this.jwt.sign(
      { sub: user._id, type: 'email-verify' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    await this.mailService.sendEmailVerification(user.email, verifyToken);

    const tokens = this.issueTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    const valid = await this.comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = this.issueTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  issueTokens(user: any) {
    const basePayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      tv: user.tokenVersion,
    };

    const accessToken = this.getAccessToken(basePayload);
    const refreshToken = this.getRefreshToken({
      sub: user._id.toString(),
      tv: user.tokenVersion,
      type: 'refresh',
    });

    return { accessToken, refreshToken };
  }

  async refresh(userFromToken: { userId: string; tv: number }) {
    const user = await this.usersService.findUserById(userFromToken.userId);
    if (!user) throw new UnauthorizedException('User not found');

    if (user.tokenVersion !== userFromToken.tv) {
      throw new UnauthorizedException('Token version mismatch');
    }

    return this.issueTokens(user);
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'email-verify') {
        throw new BadRequestException('Invalid token type');
      }

      await this.usersService.markEmailVerified(payload.sub);
      return { message: 'Email verified successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findUserByEmail(dto.email);
    // Always respond success to avoid user enumeration
    if (!user) return { message: 'If this email exists, a link was sent' };

    const resetToken = this.jwt.sign(
      { sub: user._id, type: 'password-reset' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '30m',
      },
    );

    await this.mailService.sendPasswordReset(user.email, resetToken);

    return { message: 'If this email exists, a link was sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: any;
    try {
      payload = this.jwt.verify(dto.token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.usersService.findUserById(payload.sub);
    if (!user) throw new BadRequestException('User not found');

    const passwordHash = await this.hashPassword(dto.newPassword);
    await this.usersService.setPassword(user._id.toString(), passwordHash);

    // invalidate all existing refresh tokens
    await this.usersService.incrementTokenVersion(user._id.toString());

    return { message: 'Password reset successfully' };
  }
}
