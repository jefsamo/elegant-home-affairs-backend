import { Prop } from '@nestjs/mongoose';

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
}
