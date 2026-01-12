import { Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { ResetPasswordEmail } from './templates/reset-password.email';
import { OrderConfirmationEmail } from './templates/order-confirmation.email';

//wale
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  //

  private from() {
    return (
      process.env.RESEND_FROM ||
      'No Reply <no-reply@beta.eleganthomeaffairs.com'
    );
  }

  async sendResetPasswordEmail(args: {
    to: string;
    firstName?: string;
    resetUrl: string;
  }) {
    const html = await render(
      ResetPasswordEmail({
        firstName: args.firstName,
        resetUrl: args.resetUrl,
      }),
    );
    return this.resend.emails.send({
      from: this.from(),
      to: args.to,
      subject: 'Reset your password',
      html,
    });
  }

  async sendOrderConfirmationEmail(args: {
    to: string;
    firstName?: string;
    order: {
      id: string;
      paymentReference: string;
      createdAt: Date | undefined;
      items: {
        productName?: string;
        productId: string;
        quantity: number;
        priceKobo: number;
      }[];
      subtotalKobo: number;
      shippingKobo: number;
      totalKobo: number;
      discountKobo?: number;
      deliverySummary?: string;
    };
  }) {
    const html = await render(
      OrderConfirmationEmail({
        firstName: args.firstName,
        order: args.order,
      }),
    );

    return this.resend.emails.send({
      from: this.from(),
      to: args.to,
      subject: `Order confirmed — ${args.order.paymentReference}`,
      html,
    });
  }
}
