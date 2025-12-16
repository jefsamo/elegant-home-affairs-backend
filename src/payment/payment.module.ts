import { Module } from '@nestjs/common';
import { PaystackService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [PaymentController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaymentModule {}
