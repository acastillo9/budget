import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { BudgetPeriod } from '../entities/budget-period.enum';

export class CreateBudgetDto {
  @ApiPropertyOptional({
    description: 'Budget display name',
    example: 'Monthly Groceries',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({
    description: 'Budget amount limit per period',
    example: 500,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Budget recurrence period',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @ApiProperty({
    description: 'Budget start date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiPropertyOptional({
    description: 'Budget end date (omit for ongoing)',
    example: '2025-12-31T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Category IDs tracked by this budget',
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  categories: string[];
}
