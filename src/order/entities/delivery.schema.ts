import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Delivery {
  @Prop({ required: false, trim: true })
  address1?: string;

  @Prop({ default: '', trim: true })
  address2?: string;

  @Prop({ required: false, trim: true })
  city?: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ required: false, trim: true })
  state: string;

  @Prop({ required: false, trim: true })
  stateCode: string;

  @Prop({ required: false, trim: true })
  whatsappNumber?: string;

  @Prop({ required: false, trim: true })
  shippingMethod: string;

  @Prop({ required: false })
  shippingFee?: number;

  @Prop({ required: false, trim: true })
  country: string;

  @Prop({ default: '', trim: true })
  instructions?: string;

  @Prop({ default: '', trim: true })
  phoneNumber?: string;

  @Prop({ required: true, trim: true })
  phone?: string;

  @Prop({ required: true, trim: true })
  firstName?: string;

  @Prop({ required: true, trim: true })
  lastName?: string;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);
