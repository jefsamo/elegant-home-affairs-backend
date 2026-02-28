// src/products/dto/check-availability.dto.ts
import {
  IsArray,
  ValidateNested,
  IsMongoId,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckAvailabilityItemDto {
  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CheckAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckAvailabilityItemDto)
  items: CheckAvailabilityItemDto[];
}
