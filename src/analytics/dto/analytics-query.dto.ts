import { IsIn, IsOptional, IsString } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['paid', 'pending', 'failed', 'refunded'])
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsIn(['paystack', 'manual'])
  paymentProvider?: 'paystack' | 'manual';

  @IsOptional()
  @IsIn(['customer', 'admin'])
  source?: 'customer' | 'admin';
}
