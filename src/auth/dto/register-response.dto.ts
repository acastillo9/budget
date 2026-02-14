import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ description: 'User ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'User full name', example: 'Alice Johnson' })
  name: string;

  @ApiProperty({
    description: 'Registered email address',
    example: 'alice@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Earliest time the activation code can be resent',
    example: '2025-06-15T12:30:00.000Z',
  })
  activationCodeResendAt: Date;
}
