import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class RegisterDto {
  @ApiProperty({ description: 'User full name', example: 'Alice Johnson' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email address', example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Preferred currency code',
    enum: CurrencyCode,
    example: CurrencyCode.USD,
  })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currencyCode?: CurrencyCode;
}
