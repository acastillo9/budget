import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { BudgetPeriod } from '../entities/budget-period.enum';

export class BudgetProgressDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '507f1f77bcf86cd799439011',
  })
  budgetId: string;

  @ApiProperty({ description: 'Budget name', example: 'Monthly Groceries' })
  name: string;

  @ApiProperty({ description: 'Budget amount limit', example: 500 })
  amount: number;

  @ApiProperty({
    description: 'Budget period',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  period: BudgetPeriod;

  @ApiProperty({
    description: 'Period window start date',
    example: '2025-06-01T00:00:00.000Z',
  })
  periodStart: Date;

  @ApiProperty({
    description: 'Period window end date',
    example: '2025-07-01T00:00:00.000Z',
  })
  periodEnd: Date;

  @ApiProperty({
    description: 'Total amount spent in this period',
    example: 325.5,
  })
  spent: number;

  @ApiProperty({
    description: 'Remaining budget (amount - spent)',
    example: 174.5,
  })
  remaining: number;

  @ApiProperty({ description: 'Percentage of budget used', example: 65.1 })
  percentUsed: number;

  @ApiProperty({
    description: 'Categories tracked by this budget',
    type: () => [CategoryDto],
  })
  @Type(() => CategoryDto)
  categories: CategoryDto[];
}
