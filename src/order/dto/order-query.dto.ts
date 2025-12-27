// src/order/dto/order-query.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OrderQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string; // e.g "createdAt"

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  status?: string; // orderStatus filter

  @IsOptional()
  @IsString()
  search?: string; // paymentReference, delivery email/phone, orderId
}
