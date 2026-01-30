import { forwardRef, Module } from '@nestjs/common';
import { PaystackService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment } from './entities/payment.entity';
import { PaymentSchema } from './dto/payment.schema';
import { OrderModule } from 'src/order/order.module';
import { EmailModule } from 'src/email/email.module';
import { AuthModule } from 'src/auth/auth.module';

//new implementation
@Module({
  imports: [
    HttpModule,
    EmailModule,
    forwardRef(() => OrderModule),
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    AuthModule,
  ],
  controllers: [PaymentController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentModule {}
