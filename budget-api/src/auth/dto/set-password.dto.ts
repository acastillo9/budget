import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    description:
      'Password (min 8 chars, at least one uppercase, one lowercase, one digit)',
    example: 'SecurePass1',
    minLength: 8,
    maxLength: 250,
  })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(250)
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}
