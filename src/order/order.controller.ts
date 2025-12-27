import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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

  // @Post(':id/refund')
  // @Roles('admin')
  // refund(@Param('id') id: string) {
  //   // return this.orderService.refund(id);
  // }
}
