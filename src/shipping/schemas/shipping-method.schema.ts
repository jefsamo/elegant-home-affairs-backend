import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingMethodDocument = ShippingMethod & Document;
export type ServiceLevel = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';

@Schema({ timestamps: true, collection: 'shipping_methods' })
export class ShippingMethod {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string; // "GIGL_STANDARD", "GIGL_GOFASTER", "AIR_FREIGHT"

  @Prop({ required: true, trim: true })
  name: string; // "GIGL | Wait Time: 3–5 business days..."

  @Prop({
    required: true,
    enum: ['STANDARD', 'EXPRESS', 'SAME_DAY'],
    default: 'STANDARD',
  })
  serviceLevel: ServiceLevel;

  // Apply to NON-LAGOS states by default (you can extend later)
  @Prop({ required: true, enum: ['NON_LAGOS', 'ALL'], default: 'NON_LAGOS' })
  applicability: 'NON_LAGOS' | 'ALL';

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  etaText?: string;

  @Prop({ required: true, min: 0 })
  priceKobo: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  // OPTIONAL: If later you want per-state override pricing
  @Prop({ type: [String], default: [] })
  allowedStateCodes: string[]; // [] means all non-lagos; else restrict.
}

export const ShippingMethodSchema =
  SchemaFactory.createForClass(ShippingMethod);
ShippingMethodSchema.index({ applicability: 1, isActive: 1, sortOrder: 1 });
