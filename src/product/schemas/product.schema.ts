// src/products/schemas/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export type ProductKind = 'single' | 'combo';

@Schema({ timestamps: true })
export class ProductComponent {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number; // how many units of this product per 1 combo
}

const ProductComponentSchema = SchemaFactory.createForClass(ProductComponent);

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

  @Prop({ type: String, enum: ['single', 'combo'], default: 'single' })
  kind: ProductKind;

  @Prop({ type: [ProductComponentSchema], default: [] })
  components: ProductComponent[];

  @Prop({ type: Number, default: 0 })
  bundlePrice?: number; // if > 0 use as price
}

export const ProductSchema = SchemaFactory.createForClass(Product);
