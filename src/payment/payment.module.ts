import { Module } from '@nestjs/common';
import { PaystackService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment } from './entities/payment.entity';
import { PaymentSchema } from './dto/payment.schema';
import { OrderModule } from 'src/order/order.module';

@Module({
  imports: [
    HttpModule,
    OrderModule,
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
  ],
  controllers: [PaymentController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentModule {}
