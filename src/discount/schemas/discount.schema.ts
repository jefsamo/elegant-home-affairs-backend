// src/categories/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DiscountDocument = Discount & Document;

@Schema({ timestamps: true })
export class Discount {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true })
  discountPercentage: number;

  @Prop({ trim: true })
  description?: string;
  @Prop({ default: true })
  isActive: boolean;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);
