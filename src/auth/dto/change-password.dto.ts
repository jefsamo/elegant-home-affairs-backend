/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, {
    message: 'New password must be at least 8 characters',
  })
  newPassword!: string;

  @IsString()
  @ValidateIf((o) => o.newPassword)
  confirmNewPassword!: string;

  @IsOptional()
  @IsBoolean()
  logoutOtherSessions?: boolean;
}
