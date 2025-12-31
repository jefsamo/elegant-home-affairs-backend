import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LagosShippingOptionDocument = LagosShippingOption & Document;

export type ServiceLevel = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';

@Schema({ timestamps: true, collection: 'lagos_shipping_options' })
export class LagosShippingOption {
  @Prop({ required: true, uppercase: true, default: 'LA' })
  stateCode: string; // Always "LA"

  @Prop({ required: true, trim: true })
  groupName: string; // "Lagos Island", "Lagos Mainland", "Outskirts"

  @Prop({ required: true, trim: true })
  label: string; // "After Jakande", "Before Chevron", etc.

  @Prop({
    required: true,
    enum: ['STANDARD', 'EXPRESS', 'SAME_DAY'],
    default: 'STANDARD',
  })
  serviceLevel: ServiceLevel;

  @Prop({ trim: true })
  etaText?: string; // "1–2 business days", etc.

  @Prop({ required: true, min: 0 })
  priceKobo: number; // store in kobo

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const LagosShippingOptionSchema =
  SchemaFactory.createForClass(LagosShippingOption);
LagosShippingOptionSchema.index({
  stateCode: 1,
  groupName: 1,
  serviceLevel: 1,
  sortOrder: 1,
});
