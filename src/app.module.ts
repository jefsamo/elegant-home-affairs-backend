import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { PaymentModule } from './payment/payment.module';
import { OrderModule } from './order/order.module';
import { DiscountModule } from './discount/discount.module';
import { ShippingModule } from './shipping/shipping.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  //
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', cache: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    MailModule,
    ProductModule,
    CategoryModule,
    PaymentModule,
    OrderModule,
    DiscountModule,
    ShippingModule,
    CloudinaryModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
