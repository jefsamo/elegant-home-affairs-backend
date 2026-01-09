import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersAdminService } from './orders-admin.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/order/entities/order.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],

  controllers: [
    AnalyticsController,
    AdminAnalyticsController,
    AdminOrdersController,
  ],
  providers: [AnalyticsService, AnalyticsService, OrdersAdminService],
})
export class AnalyticsModule {}
