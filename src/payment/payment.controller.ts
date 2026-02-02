/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
  Query,
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
import { ListPaymentsQueryDto } from './dto/list-payments.query';
import { EitherAuthGuard } from 'src/common/guards/either-auth.guard';

//new implementation

@Controller('payment/paystack')
export class PaymentController {
  constructor(private readonly paystack: PaystackService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  async findAll(
    @Query() query: ListPaymentsQueryDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const isAdmin = user.roles?.includes('admin');
    return this.paystack.findPaginated({
      query,
      userId: isAdmin ? undefined : user.userId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const isAdmin = user.roles?.includes('admin');
    return this.paystack.findOneForUser({
      id,
      userId: isAdmin ? undefined : user.userId,
    });
  }
  //new implementation
  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // @UseGuards(EitherAuthGuard)
  @Roles('customer', 'admin')
  initialize(@Body() dto: InitializePaymentDto, @CurrentUser() user: any) {
    return this.paystack.initializePaystack(user?.userId, dto);
  }

  @Post('create-page')
  createPaystackPaymentPage(@Body() dto: CreatePageDto) {
    return this.paystack.paymentPage(dto);
  }

  @Get('verify/:reference')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('customer', 'admin')
  @UseGuards(EitherAuthGuard)
  verify(@Param('reference') reference: string, @CurrentUser() user: any) {
    return this.paystack.verifyPaystackAndCreateOrder(user?.userId, reference);
  }

  @Get('verify-with-guest/:reference')
  @UseGuards(EitherAuthGuard)
  verifyV2(@Param('reference') reference: string, @Req() req: any) {
    // req.user for logged-in user
    // req.guest for guest
    const userId = req.user?.userId;
    const guestId = req.guest?.guestId;

    return this.paystack.verifyPaystackAndCreateOrderV2({
      reference,
      userId,
      guestId,
    });
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
