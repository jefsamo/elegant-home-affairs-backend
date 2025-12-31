import { IsString, Length } from 'class-validator';

export class GetShippingOptionsDto {
  @IsString()
  @Length(2, 3)
  stateCode!: string;
}
