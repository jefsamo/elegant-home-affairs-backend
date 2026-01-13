// src/products/dto/create-product.dto.ts
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  isTrending?: boolean;

  @IsOptional()
  isSoldOut?: boolean;

  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  keepImages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsString()
  categoryId: string;
}
