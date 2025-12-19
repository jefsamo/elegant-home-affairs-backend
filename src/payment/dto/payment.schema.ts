// src/payment/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  reference: string;

  @Prop({ trim: true })
  status: string;
  @Prop({ trim: true })
  accessCode: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: string;

  @Prop({ type: Object })
  checkoutSnapshot?: any;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
