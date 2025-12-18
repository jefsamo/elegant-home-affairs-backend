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
import { CreatePageDto } from './dto/create-page.dto';

@Controller('payment/paystack')
export class PaymentController {
  constructor(private readonly paystack: PaystackService) {}
  @Post('initialize')
  initialize(@Body() dto: InitializePaystackDto) {
    return this.paystack.initialize(dto);
  }
  @Post('create-page')
  createPaystackPaymentPage(@Body() dto: CreatePageDto) {
    return this.paystack.paymentPage(dto);
  }

  @Get('verify/:reference')
  verify(@Param('reference') reference: string) {
    return this.paystack.verify(reference);
  }
  @Get('page/:id')
  fetchPage(@Param('id') id: number) {
    return this.paystack.fetchPage(id);
  }

  @Post('webhook')
  webhook(@Req() req: Request) {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    this.paystack.verifyWebhookSignature(rawBody, signature);
    return { received: true };
  }
}
