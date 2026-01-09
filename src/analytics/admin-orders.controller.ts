import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OrdersAdminService } from './orders-admin.service';
import { OrdersHistoryQueryDto } from './dto/orders-history-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('analytics/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOrdersController {
  constructor(private readonly ordersAdminService: OrdersAdminService) {}

  @Get('all-time')
  allTime(@Query() q: OrdersHistoryQueryDto) {
    return this.ordersAdminService.findAllTime(q);
  }
}
