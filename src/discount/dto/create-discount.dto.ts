// src/discount/dto/create-discount.dto.ts
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name: string; // code

  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsOptional()
  @IsString()
  description?: string;
}
