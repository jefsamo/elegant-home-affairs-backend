// src/payment/dto/create-page.dto.ts
import { IsString } from 'class-validator';

export class CreatePageDto {
  @IsString()
  name: string;
}
