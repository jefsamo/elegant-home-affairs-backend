import { IsIn, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn([
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'needs_review',
  ])
  orderStatus: string;
}
