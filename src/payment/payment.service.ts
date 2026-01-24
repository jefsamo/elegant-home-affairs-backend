/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreatePageDto } from './dto/create-page.dto';
import { OrdersService } from 'src/order/order.service';
import { Payment, PaymentDocument } from './dto/payment.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class PaystackService {
  private readonly baseUrl =
    process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co';
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;

  constructor(
    private readonly http: HttpService,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly emailService: EmailService,
  ) {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not set');
    }
  }

  private buildDeliverySummary(delivery: any): string {
    if (!delivery || typeof delivery !== 'object') {
      return 'Delivery details not available.';
    }

    const lines: string[] = [];

    const fullName = [delivery.firstName, delivery.lastName]
      .filter(Boolean)
      .join(' ');

    if (fullName) lines.push(fullName);
    if (delivery.phone) lines.push(`Phone: ${delivery.phone}`);

    const address = [
      delivery.address1,
      delivery.address2,
      delivery.city,
      delivery.state,
      delivery.country,
    ]
      .filter(Boolean)
      .join(', ');

    if (address) lines.push(address);

    if (delivery.instructions) {
      lines.push(`Instructions: ${delivery.instructions}`);
    }

    return lines.join('\n');
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
      shippingFee: dto.shippingFee,
      status: 'initialized',
      createdAt: new Date().toISOString(),
      userId,
      checkoutSnapshot: {
        cart: dto.cart,
        delivery: dto.delivery,
        shippingFee: dto.delivery.shippingFee,
        shippingMethod: dto.delivery.shippingMethod,
        metadata: dto.metadata ?? {},
        discount: dto.discountCode
          ? {
              discountCode: dto.discountCode,
              discountId: dto.discountId,
              discountPercentage: dto.discountPercentage,
            }
          : null,
      },
      ...dto,
    } as any);

    return resp.data; // { status, message, data: { authorization_url, access_code, reference } }
  }
  async initializePaystackV2(
    userId: string,
    dto: InitializePaymentDto,
    // dto2: AdminInitPaystackDto,
  ) {
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
      // amount: dto.amount,
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
      ...dto,
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
      shippingFee: snapshot?.shippingFee / 100,
      shippingMethod: snapshot?.shippingMethod,
      delivery: snapshot.delivery,
      discount: snapshot.discount
        ? {
            discountId: snapshot.discount.discountId,
            code: snapshot.discount.discountCode,
            percentage: snapshot.discount.discountPercentage,
          }
        : null,
    });

    const { firstName, email } = order.delivery;
    // const { createdAt } = order;
    await this.emailService.sendOrderConfirmationEmail({
      to: email,
      firstName: firstName,
      order: {
        id: String(order._id),
        paymentReference: order.paymentReference,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          priceKobo: i.price,
        })),
        subtotalKobo: order.subtotal,
        shippingKobo: order.shipping,
        totalKobo: order.total,
        discountKobo: order.discountAmount ?? 0,
        deliverySummary: this.buildDeliverySummary(order.delivery),
      },
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

  async refundTransaction(args: { transaction: string; amount?: number }) {
    // Paystack: POST /refund with transaction (id or reference) :contentReference[oaicite:1]{index=1}
    const url = `${this.baseUrl}/refund`;

    const payload: any = { transaction: args.transaction };
    if (args.amount != null) payload.amount = args.amount;

    const resp = await firstValueFrom(
      this.http.post(url, payload, { headers: this.headers }),
    );

    // Paystack usually returns: { status: true, message, data: {...} }
    if (resp.data?.status !== true) {
      throw new BadRequestException(resp.data?.message ?? 'Refund failed');
    }

    return resp.data;
  }

  async createRefund(args: {
    transaction: string; // transaction reference or id
    amount?: number; // kobo (optional)
    currency?: string; // optional
    customer_note?: string;
    merchant_note?: string;
  }) {
    const url = `${this.baseUrl}/refund`;

    const payload: any = {
      transaction: args.transaction,
    };

    if (args.amount != null) payload.amount = args.amount;
    if (args.currency) payload.currency = args.currency;
    if (args.customer_note) payload.customer_note = args.customer_note;
    if (args.merchant_note) payload.merchant_note = args.merchant_note;

    const resp = await firstValueFrom(
      this.http.post(url, payload, { headers: this.headers }),
    );

    if (!resp.data?.status) {
      throw new BadRequestException('Paystack refund request failed');
    }

    return resp.data; // includes data about refund
  }
  async findPaginated(args: {
    query: ListPaymentsQueryDto;
    userId?: string; // undefined for admin
  }) {
    const { query, userId } = args;

    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<PaymentDocument> = {};
    if (userId) filter.userId = userId;
    if (query.status) filter.status = query.status;

    if (query.search?.trim()) {
      filter.reference = { $regex: query.search.trim(), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async findOneForUser(args: { id: string; userId?: string }) {
    const { id, userId } = args;
    const filter: any = { _id: id };
    if (userId) filter.userId = userId;
    return this.paymentModel.findOne(filter).lean();
  }
}
