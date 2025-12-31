import { IsOptional, IsString, Length } from 'class-validator';

export class ResolveShippingCostDto {
  @IsString()
  @Length(2, 3)
  stateCode!: string;

  @IsOptional()
  @IsString()
  lagosOptionId?: string;

  @IsOptional()
  @IsString()
  shippingMethodId?: string;
}
