// src/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: string;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    required: true,
  })
  items: { productId: string; quantity: number; price: number }[];

  @Prop({ required: true })
  subtotal: number; // in kobo

  @Prop({ required: true })
  shipping: number; // in kobo

  @Prop({ required: true })
  total: number; // in kobo
  @Prop({ required: true })
  totalAfterDiscount: number;
  @Prop({ required: false })
  totalAndDiscountPlusShipping?: number;

  @Prop({ required: true })
  paymentReference: string;

  @Prop({ default: 'paid' })
  paymentStatus: string;

  @Prop({ default: 'processing' })
  orderStatus: string;

  @Prop({ type: Object, required: true })
  delivery: any;

  @Prop({ type: Types.ObjectId, ref: 'Discount', default: null })
  discountId?: string;

  @Prop({ default: null, trim: true })
  discountCode?: string;
  @Prop({ default: 'ship' })
  shippingMethod?: string;

  @Prop({ default: 0 })
  discountPercentage?: number;

  @Prop({ default: 0 })
  discountAmount?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy?: string; // admin who placed it

  @Prop({ default: 'customer' })
  source?: 'customer' | 'admin';

  @Prop({ default: 'paystack' })
  paymentProvider?: 'paystack' | 'manual';

  @Prop({ default: null })
  adminNote?: string;

  @Prop({ type: Object, default: null })
  refund?: {
    provider: 'paystack';
    refundReference?: string;
    transactionReference?: string;
    amount?: number;
    status?: string;
    customerNote?: string;
    merchantNote?: string;
    initiatedAt?: Date;
    raw?: any;
  };
}

export const OrderSchema = SchemaFactory.createForClass(Order);
