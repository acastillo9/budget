import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class UserDto {
  @ApiProperty({ description: 'User ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'User full name', example: 'Alice Johnson' })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'alice@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/avatar.jpg',
  })
  picture: string;

  @ApiProperty({
    description: 'Preferred currency',
    enum: CurrencyCode,
    example: CurrencyCode.USD,
  })
  currencyCode: CurrencyCode;
}
