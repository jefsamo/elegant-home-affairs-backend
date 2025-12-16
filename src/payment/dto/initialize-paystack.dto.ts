// src/payment/dto/initialize-paystack.dto.ts
import { IsEmail, IsInt, IsOptional, IsObject, Min } from 'class-validator';

export class InitializePaystackDto {
  @IsEmail()
  email: string;

  // amount in kobo
  @IsInt()
  @Min(100) // ₦1.00 minimum example; set what you want
  amount: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
