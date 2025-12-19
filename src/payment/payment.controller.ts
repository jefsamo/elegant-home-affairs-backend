/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
  UseGuards,
} from '@nestjs/common';
import { PaystackService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { InitializePaystackDto } from './dto/initialize-paystack.dto';
import { Headers } from '@nestjs/common';
import { CreatePageDto } from './dto/create-page.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@Controller('payment/paystack')
export class PaymentController {
  constructor(private readonly paystack: PaystackService) {}
  //
  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  initialize(@Body() dto: InitializePaymentDto, @CurrentUser() user: any) {
    return this.paystack.initializePaystack(user?.userId, dto);
  }
  @Post('create-page')
  createPaystackPaymentPage(@Body() dto: CreatePageDto) {
    return this.paystack.paymentPage(dto);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  verify(@Param('reference') reference: string, @CurrentUser() user: any) {
    return this.paystack.verifyPaystackAndCreateOrder(user?.userId, reference);
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
