/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  // Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './order.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RefundOrderDto } from './entities/refund-order.dto';
import { AdminCreateOrderDto } from './entities/admin-create-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'customer')
  findAll(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    const isAdmin = user.roles?.includes('admin');

    return this.orderService.findPaginated({
      query,
      userId: isAdmin ? undefined : user.userId,
    });
  }

  @Post('create-order/guest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminCreateOrder(
    @Body() dto: AdminCreateOrderDto,
    @CurrentUser() admin: { userId: string },
  ) {
    return this.orderService.adminCreateOrder(dto, admin.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'customer')
  getById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; roles: string[] },
  ) {
    return this.orderService.findById(id, user);
  }

  @Patch(':id/status')
  @Roles('admin')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  @Roles('admin')
  cancel(@Param('id') id: string) {
    return this.orderService.cancel(id);
  }

  @Post(':orderId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  refundOrder(
    @Param('orderId') orderId: string,
    @Body() dto: RefundOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.orderService.refundOrder({
      orderId,
      adminUserId: user?.userId,
      dto,
    });
  }

  // @Post(':id/refund')
  // @Roles('admin')
  // refund(@Param('id') id: string) {
  //   // return this.orderService.refund(id);
  // }
}
