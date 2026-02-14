import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @ApiProperty({
    description:
      'Transaction amount (positive value; negated automatically for expenses)',
    example: 75.5,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Transaction date',
    example: '2025-06-15T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Weekly grocery shopping',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Bought items for the week',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  category: string;

  @ApiProperty({
    description: 'Account ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  account: string;

  bill?: string;
}
