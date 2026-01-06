// src/orders/dto/refund-order.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RefundOrderDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number; // kobo (optional, defaults to full transaction amount)

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsOptional()
  @IsString()
  merchantNote?: string;
}
