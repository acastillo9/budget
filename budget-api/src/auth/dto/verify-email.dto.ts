import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email address to verify',
    example: 'alice@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Six-digit activation code sent via email',
    example: '482916',
  })
  @IsNotEmpty()
  @IsString()
  activationCode: string;
}
