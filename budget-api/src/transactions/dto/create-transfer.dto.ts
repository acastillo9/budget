import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsDate,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ description: 'Transfer amount', example: 500 })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Transfer date',
    example: '2025-06-15T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({
    description: 'Transfer description',
    example: 'Move savings to checking',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Monthly transfer',
  })
  @IsOptional()
  @IsString()
  notes: string;

  @ApiProperty({
    description: 'Destination account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  account: string;

  @ApiProperty({
    description: 'Origin account ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  originAccount: string;
}
