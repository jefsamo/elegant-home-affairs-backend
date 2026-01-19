// src/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Delivery, DeliverySchema } from './delivery.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: string;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: false },
        color: { type: String, required: false },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    required: true,
  })
  items: {
    productId: string;
    quantity: number;
    price: number;
    productName?: string;
    color?: string;
  }[];

  @Prop({ required: true })
  subtotal: number; // in naira

  @Prop({ required: true })
  shipping: number; // in naira

  @Prop({ required: true })
  total: number; // in naira
  @Prop({ required: true })
  totalAfterDiscount: number;
  @Prop({ required: false })
  totalAndDiscountPlusShipping?: number;

  @Prop({ required: true })
  paymentReference: string;

  @Prop({ default: 'paid' })
  paymentStatus: string;

  @Prop({ default: null })
  paystackAccessCode?: string;

  @Prop({ default: null })
  paystackAuthorizationUrl?: string;

  @Prop({ default: 'processing' })
  orderStatus: string;

  @Prop({ type: DeliverySchema, required: true })
  delivery: Delivery;

  @Prop({ type: Types.ObjectId, ref: 'Discount', default: null })
  discountId?: string;

  @Prop({ default: null, trim: true })
  discountCode?: string;

  @Prop({ default: 'ship' })
  shippingMethod?: 'ship' | 'pickup';

  @Prop({ default: 0 })
  discountPercentage?: number;

  @Prop({ default: 0 })
  discountAmount?: number;

  @Prop({ default: 0 })
  totalAndShipping?: number;

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

  createdAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ paymentReference: 1 }, { unique: true });
