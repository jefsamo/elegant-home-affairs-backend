import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './entities/order.entity';
import { Product, ProductSchema } from 'src/product/schemas/product.schema';
import { PaymentModule } from 'src/payment/payment.module';
import { Payment, PaymentSchema } from 'src/payment/dto/payment.schema';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrderModule {}
