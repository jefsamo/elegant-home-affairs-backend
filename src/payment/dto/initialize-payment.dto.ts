/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/payment/dto/initialize-payment.dto.ts
import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
  IsArray,
  IsString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  price: number;
}

class DeliveryDto {
  @IsString() firstName: string;
  @IsString() lastName: string;

  @IsEmail() email: string;

  @IsString() phoneNumber: string;
  @IsString() address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsString() city: string;
  @IsString() state: string;
  @IsString() country: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class InitializePaymentDto {
  @IsEmail()
  email: string;

  // amount in kobo
  @IsInt()
  @Min(100)
  amount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cart: CartItemDto[];

  @ValidateNested()
  @Type(() => DeliveryDto)
  delivery: DeliveryDto;

  @IsOptional()
  @IsObject()
  shipping: any;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsString()
  deliveryMode?: string;

  @IsOptional()
  @IsString()
  discountId?: string;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;
}
