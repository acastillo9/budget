import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailDto {
  @ApiProperty({ description: 'Email address', example: 'alice@example.com' })
  @IsEmail()
  email: string;
}
