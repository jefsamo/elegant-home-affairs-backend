/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InitializePaystackDto } from './dto/initialize-paystack.dto';
import { firstValueFrom } from 'rxjs';
import { CreatePageDto } from './dto/create-page.dto';

@Injectable()
export class PaystackService {
  private readonly baseUrl =
    process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co';
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;

  constructor(private readonly http: HttpService) {
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

  async initialize(dto: InitializePaystackDto) {
    const url = `${this.baseUrl}/transaction/initialize`;
    const resp = await firstValueFrom(
      this.http.post(url, dto, { headers: this.headers }),
    );
    return resp.data; // Paystack returns { status, message, data: { authorization_url, access_code, reference } }
  }
  async paymentPage(dto: CreatePageDto) {
    const url = `${this.baseUrl}/page`;
    const resp = await firstValueFrom(
      this.http.post(url, dto, { headers: this.headers }),
    );
    return resp.data;
  }

  async verify(reference: string) {
    const url = `${this.baseUrl}/transaction/verify/${reference}`;
    const resp = await firstValueFrom(
      this.http.get(url, { headers: this.headers }),
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
