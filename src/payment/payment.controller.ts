/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { PaystackService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { InitializePaystackDto } from './dto/initialize-paystack.dto';
import { Headers } from '@nestjs/common';

@Controller('payment/paystack')
export class PaymentController {
  constructor(private readonly paystack: PaystackService) {}
  @Post('initialize')
  initialize(@Body() dto: InitializePaystackDto) {
    return this.paystack.initialize(dto);
  }

  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.paystack.verify(reference);
  }

  /**
   * WEBHOOK (Recommended):
   * Paystack calls this endpoint after payment events.
   * You verify signature, then update order status in DB.
   */
  @Post('webhook')
  webhook(@Req() req: Request) {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    this.paystack.verifyWebhookSignature(rawBody, signature);
    return { received: true };
  }
}
