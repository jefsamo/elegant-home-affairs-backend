// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private config: ConfigService) {}

  async sendEmailVerification(email: string, token: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;
    // integrate with real provider (SendGrid, SES, etc.)
    console.log(`Send email verification to ${email}: ${verifyLink}`);
  }

  async sendPasswordReset(email: string, token: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    console.log(`Send password reset to ${email}: ${resetLink}`);
  }
}
