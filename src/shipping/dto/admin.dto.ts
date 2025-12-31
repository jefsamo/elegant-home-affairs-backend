import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export type ServiceLevel = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';

export class UpsertStateDto {
  @IsString()
  @Length(2, 3)
  code!: string;

  @IsString()
  name!: string;
}

export class CreateLagosOptionDto {
  @IsString()
  groupName!: string;

  @IsString()
  label!: string;

  @IsEnum(['STANDARD', 'EXPRESS', 'SAME_DAY'] as const)
  serviceLevel!: ServiceLevel;

  @IsOptional()
  @IsString()
  etaText?: string;

  @IsInt()
  @Min(0)
  priceKobo!: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLagosOptionDto {
  @IsOptional() @IsString() groupName?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional()
  @IsEnum(['STANDARD', 'EXPRESS', 'SAME_DAY'] as const)
  serviceLevel?: ServiceLevel;
  @IsOptional() @IsString() etaText?: string;
  @IsOptional() @IsInt() @Min(0) priceKobo?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateShippingMethodDto {
  @IsString()
  @Length(3, 60)
  code!: string; // unique e.g. "GIGL_STANDARD"

  @IsString()
  name!: string;

  @IsEnum(['STANDARD', 'EXPRESS', 'SAME_DAY'] as const)
  serviceLevel!: ServiceLevel;

  @IsEnum(['NON_LAGOS', 'ALL'] as const)
  applicability!: 'NON_LAGOS' | 'ALL';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  etaText?: string;

  @IsInt()
  @Min(0)
  priceKobo!: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedStateCodes?: string[]; // optional allowlist
}

export class UpdateShippingMethodDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional()
  @IsEnum(['STANDARD', 'EXPRESS', 'SAME_DAY'] as const)
  serviceLevel?: ServiceLevel;
  @IsOptional() @IsEnum(['NON_LAGOS', 'ALL'] as const) applicability?:
    | 'NON_LAGOS'
    | 'ALL';
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() etaText?: string;
  @IsOptional() @IsInt() @Min(0) priceKobo?: number;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedStateCodes?: string[];
}
