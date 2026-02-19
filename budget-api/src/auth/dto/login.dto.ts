import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email address', example: 'alice@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: 'SecurePass1' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Whether to issue a long-lived refresh token',
    example: false,
  })
  @IsBoolean()
  rememberMe: boolean;
}
