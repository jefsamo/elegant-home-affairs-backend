// src/products/schemas/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: false })
  isTrending?: boolean;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [String], default: [] })
  colors: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: string;
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
