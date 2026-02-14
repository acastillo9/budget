import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account display name',
    example: 'Main Checking',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Account currency',
    enum: CurrencyCode,
    example: CurrencyCode.USD,
  })
  @IsEnum(CurrencyCode)
  currencyCode: CurrencyCode;

  @ApiProperty({ description: 'Initial balance', example: 1500.0 })
  @IsNumber()
  balance: number;

  @ApiProperty({
    description: 'Account type ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  accountType: string;
}
