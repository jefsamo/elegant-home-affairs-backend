// src/payments/dto/list-payments.query.ts
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class ListPaymentsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string; // "1"

  @IsOptional()
  @IsNumberString()
  limit?: string; // "10"

  @IsOptional()
  @IsString()
  search?: string; // reference contains

  @IsOptional()
  @IsIn(['initialized', 'success', 'failed', 'abandoned', 'amount_mismatch'])
  status?: string;
}
