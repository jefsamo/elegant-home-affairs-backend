// src/payment/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, trim: true })
  reference: string;

  @Prop({ trim: true })
  status: string;
  @Prop({ trim: true })
  accessCode: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  createdAt: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
