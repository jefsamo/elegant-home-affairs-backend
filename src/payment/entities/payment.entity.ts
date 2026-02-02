/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

//new implementation

export class Payment {
  @Prop({ type: Object, default: null })
  refund?: {
    refundReference?: string;
    amount?: number;
    status?: string;
    initiatedAt?: Date;
    raw?: any;
  };

  reference?: string;
  status?: string;
  accessCode?: string;
  shippingFee?: number; //in kobo

  amount?: number; //in kobo
  checkoutSnapshot?: any;
  @Prop({ type: String, required: false, index: true })
  guestId?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  userId?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ reference: 1 }, { unique: true });
