// src/admin-reporting/dto/timeseries-query.dto.ts
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class TimeSeriesQueryDto {
  @IsIn(['day', 'week', 'month'])
  interval: 'day' | 'week' | 'month';

  @IsOptional()
  @IsISO8601()
  start?: string;

  @IsOptional()
  @IsISO8601()
  end?: string;

  @IsOptional()
  @IsString()
  tz?: string; // default Europe/London

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsIn(['customer', 'admin'])
  source?: 'customer' | 'admin';

  @IsOptional()
  @IsIn(['paystack', 'manual'])
  paymentProvider?: 'paystack' | 'manual';
}
