import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class OrderPaginationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn([
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'needs_review',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string; // reference / customer email / etc
}
