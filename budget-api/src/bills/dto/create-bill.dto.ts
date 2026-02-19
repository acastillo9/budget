import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { BillFrequency } from '../entities/bill-frequency.enum';

export class CreateBillDto {
  @ApiProperty({ description: 'Bill name', example: 'Netflix Subscription' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Bill amount', example: 15.99, minimum: 1 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Bill due date',
    example: '2025-07-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiPropertyOptional({
    description: 'End date for recurring bill',
    example: '2025-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Recurrence frequency',
    enum: BillFrequency,
    example: BillFrequency.MONTHLY,
  })
  @IsEnum(BillFrequency)
  frequency: BillFrequency;

  @ApiProperty({
    description: 'Payment account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  account: string;

  @ApiProperty({
    description: 'Bill category ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  category: string;
}
