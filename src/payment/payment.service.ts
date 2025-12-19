/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreatePageDto } from './dto/create-page.dto';
import { OrdersService } from 'src/order/order.service';
import { Payment } from './dto/payment.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@Injectable()
export class PaystackService {
  private readonly baseUrl =
    process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co';
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;

  constructor(
    private readonly http: HttpService,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly ordersService: OrdersService,
  ) {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not set');
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async paymentPage(dto: CreatePageDto) {
    const url = `${this.baseUrl}/page`;
    const resp = await firstValueFrom(
      this.http.post(url, dto, { headers: this.headers }),
    );
    return resp.data;
  }

  async fetchPage(id: number) {
    const url = `${this.baseUrl}/page/${id}`;
    const resp = await firstValueFrom(
      this.http.get(url, { headers: this.headers }),
    );
    return resp.data;
  }
  async initializePaystack(userId: string, dto: InitializePaymentDto) {
    const url = `${this.baseUrl}/transaction/initialize`;

    const payload = {
      email: dto.email,
      amount: dto.amount, // kobo
      metadata: {
        ...dto.metadata,
        userId,
      },
    };

    const resp = await firstValueFrom(
      this.http.post(url, payload, { headers: this.headers }),
    );

    const { reference, access_code } = resp.data?.data ?? {};
    if (!reference || !access_code) {
      throw new BadRequestException('Paystack initialization failed');
    }

    // Save payment record + checkout snapshot for later Order creation
    await this.paymentModel.create({
      reference,
      accessCode: access_code,
      status: 'initialized',
      amount: dto.amount,
      createdAt: new Date().toISOString(),
      userId,
      checkoutSnapshot: {
        cart: dto.cart,
        delivery: dto.delivery,
        metadata: dto.metadata ?? {},
        discount: dto.discountCode
          ? {
              discountCode: dto.discountCode,
              discountId: dto.discountId,
              discountPercentage: dto.discountPercentage,
            }
          : null,
      },
    } as any);

    return resp.data; // { status, message, data: { authorization_url, access_code, reference } }
  }

  async verifyPaystackAndCreateOrder(userId: string, reference: string) {
    // Find payment
    const payment = await this.paymentModel.findOne({ reference, userId });
    if (!payment) throw new BadRequestException('Payment record not found');

    // If already successful, avoid duplicate orders
    if (payment.status === 'success') {
      // You may also fetch the existing order by reference and return it
      return { status: 'already_verified', reference };
    }

    // Verify on Paystack
    const url = `${this.baseUrl}/transaction/verify/${reference}`;
    const resp = await firstValueFrom(
      this.http.get(url, { headers: this.headers }),
    );

    const data = resp.data?.data;
    if (!data)
      throw new BadRequestException('Invalid Paystack verify response');

    const paystackStatus = data.status; // "success" when paid
    const paidAmount = data.amount; // in kobo

    // Safety checks
    if (paystackStatus !== 'success') {
      await this.paymentModel.updateOne(
        { _id: (payment as any)._id },
        { status: paystackStatus },
      );
      throw new BadRequestException(
        `Payment not successful: ${paystackStatus}`,
      );
    }

    if (paidAmount !== payment.amount) {
      await this.paymentModel.updateOne(
        { _id: (payment as any)._id },
        { status: 'amount_mismatch' },
      );
      throw new BadRequestException('Payment amount mismatch');
    }

    // Mark payment as success
    await this.paymentModel.updateOne(
      { _id: (payment as any)._id },
      { status: 'success' },
    );

    // Create Order from stored snapshot
    const snapshot = (payment as any).checkoutSnapshot;
    if (!snapshot?.cart || !snapshot?.delivery) {
      throw new BadRequestException('Missing checkout snapshot on payment');
    }

    const order = await this.ordersService.createFromPayment({
      userId,
      reference,
      amount: payment.amount,
      cart: snapshot.cart,
      delivery: snapshot.delivery,
      discount: snapshot.discount
        ? {
            discountId: snapshot.discount.discountId,
            code: snapshot.discount.discountCode,
            percentage: snapshot.discount.discountPercentage,
          }
        : null,
    });

    return { status: 'success', order };
  }
  // Webhook signature check (recommended)
  verifyWebhookSignature(rawBody: Buffer, signature?: string) {
    const crypto = require('crypto');
    if (!signature)
      throw new UnauthorizedException('Missing x-paystack-signature');

    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature)
      throw new UnauthorizedException('Invalid webhook signature');
    return true;
  }
}
