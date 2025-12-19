// src/discount/dto/validate-discount.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
