import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { State, StateSchema } from './schemas/state.schema';
import {
  LagosShippingOption,
  LagosShippingOptionSchema,
} from './schemas/lagos-option.schema';
import {
  ShippingMethod,
  ShippingMethodSchema,
} from './schemas/shipping-method.schema';
import { ShippingAdminController } from './shipping.admin.controller';
import { ShippingAdminService } from './shipping.admin.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: State.name, schema: StateSchema },
      { name: ShippingMethod.name, schema: ShippingMethodSchema },
      { name: LagosShippingOption.name, schema: LagosShippingOptionSchema },
    ]),
    AuthModule,
    // MongooseModule.forFeature([
    //   { name: ShippingMethod.name, schema: ShippingMethodSchema },
    // ]),
    // MongooseModule.forFeature([
    //   { name: LagosShippingOption.name, schema: LagosShippingOptionSchema },
    // ]),
  ],
  controllers: [ShippingController, ShippingAdminController],
  providers: [ShippingService, ShippingAdminService],
})
export class ShippingModule {}
