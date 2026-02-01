/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/auth/auth.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { EmailService } from 'src/email/email.service';
import { randomBytes, randomUUID } from 'crypto';
import { GuestSession, GuestSessionDocument } from './schemas/guest.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private emailService: EmailService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(GuestSession.name)
    private guestModel: Model<GuestSessionDocument>,
  ) {}

  private hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private getAccessToken(payload: any): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn:
        this.config.get<JwtSignOptions['expiresIn']>('JWT_ACCESS_EXPIRES_IN') ??
        '50m',
    });
  }

  private getRefreshToken(payload: any): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn:
        this.config.get<JwtSignOptions['expiresIn']>(
          'JWT_REFRESH_EXPIRES_IN',
        ) ?? '7d',
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
      // console.log(this.config.get<string>('JWT_ACCESS_SECRET'));

      if (payload.type !== 'email-verify') {
        throw new BadRequestException('Invalid token type');
      }

      await this.usersService.markUserEmailAsVerified(payload.sub);
      return { message: 'Email verified successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase().trim(),
    });
    if (!user) return { message: 'If this email exists, a link was sent' };

    const token = randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = await this.hashPassword(token);
    user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
    await user.save();

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontend}/reset-password?token=${token}&email=${encodeURIComponent(
      user.email,
    )}`;

    try {
      await this.emailService.sendResetPasswordEmail({
        to: user.email,
        firstName: user.firstName,
        resetUrl,
      });
    } catch (e) {
      console.error('RESEND_SEND_RESET_FAILED:', e);
    }

    return {
      message: 'If this email exists, a link was sent',
      status: 'success',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.userModel.findOne({ email });
    if (!user) throw new BadRequestException('Invalid or expired token');

    if (
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    const isMatch = await this.comparePassword(
      dto.token,
      user.resetPasswordTokenHash!,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await this.hashPassword(dto.newPassword);
    user.passwordHash = passwordHash;

    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    await this.usersService.incrementTokenVersion(user._id.toString());

    return { message: 'Password reset successfully', status: 'success' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel
      .findById(userId)
      .select('+passwordHash')
      .lean(false);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    const saltRounds = 12;
    const newHash = await bcrypt.hash(dto.newPassword, saltRounds);

    user.passwordHash = newHash;

    if (dto.logoutOtherSessions) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }

    await user.save();

    return { message: 'Password updated successfully', status: true };
  }

  async loginWithGoogle(googleUser: {
    googleId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    picture?: string | null;
  }) {
    if (!googleUser.email) {
      throw new BadRequestException('Google account has no email');
    }

    // 1) Find existing user by email OR googleId
    let user = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      // create a new user
      user = await this.usersService.createFromOAuth({
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        provider: 'google',
        providerId: googleUser.googleId,
        avatarUrl: googleUser.picture ?? undefined,
        // roles: ['customer'] // default
      });
    } else {
      // optionally link googleId if not linked
      if (!user.providerId || user.provider !== 'google') {
        await this.usersService.linkOAuth(user._id.toString(), {
          provider: 'google',
          providerId: googleUser.googleId,
          avatarUrl: googleUser.picture ?? undefined,
        });
      }
    }

    // 2) Issue your normal JWT
    const payload = { sub: user._id.toString(), roles: user.roles };
    const accessToken = await this.jwt.signAsync(payload);

    return { accessToken, user };
  }

  //new implementation
  async createGuestSession(meta?: { ip?: string; userAgent?: string }) {
    const guestId = randomUUID();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = await this.guestModel.create({
      guestId,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    console.log(session);
    const payload = {
      typ: 'guest',
      gid: session.guestId,
      // sid: session._id.toString(),
    };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '10m',
    });

    return {
      guestToken: token,
      guestId: session.guestId,
      expiresAt: session.expiresAt,
    };
  }

  async validateGuestTokenPayload(payload: any) {
    if (!payload || payload.typ !== 'guest' || !payload.gid) {
      throw new UnauthorizedException('Invalid guest token');
    }

    const session = await this.guestModel.findOne({ guestId: payload.gid });
    if (!session) throw new UnauthorizedException('Guest session not found');

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Guest session expired');
    }

    return session;
  }
}
