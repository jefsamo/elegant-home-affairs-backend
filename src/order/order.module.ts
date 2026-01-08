import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.entity';
import { Product, ProductSchema } from 'src/product/schemas/product.schema';
import { PaymentModule } from 'src/payment/payment.module';
import { Payment, PaymentSchema } from 'src/payment/dto/payment.schema';
import { DiscountModule } from 'src/discount/discount.module';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { DashboardService } from './dashboard.admin.service';
import { DashboardController } from './dashboard.admin.controller';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    DiscountModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [OrderController, DashboardController],
  providers: [OrdersService, DashboardService],
  exports: [OrdersService],
})
export class OrderModule {}
