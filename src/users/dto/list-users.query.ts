// src/users/dto/list-users.query.ts
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string; // email/firstName/lastName/phoneNumber

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: 'true' | 'false';

  @IsOptional()
  @IsIn(['true', 'false'])
  isEmailVerified?: 'true' | 'false';
}
