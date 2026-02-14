import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Updated display name',
    example: 'Alice Johnson',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  picture?: string;

  @ApiPropertyOptional({
    description: 'Preferred currency',
    enum: CurrencyCode,
    example: CurrencyCode.USD,
  })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: CurrencyCode;
}
