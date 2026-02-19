import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { BudgetPeriod } from '../entities/budget-period.enum';

export class BudgetDto {
  @ApiProperty({
    description: 'Budget ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Budget display name',
    example: 'Monthly Groceries',
  })
  name: string;

  @ApiProperty({ description: 'Budget amount limit per period', example: 500 })
  amount: number;

  @ApiProperty({
    description: 'Budget recurrence period',
    enum: BudgetPeriod,
    example: BudgetPeriod.MONTHLY,
  })
  period: BudgetPeriod;

  @ApiProperty({
    description: 'Budget start date',
    example: '2025-01-01T00:00:00.000Z',
  })
  startDate: Date;

  @ApiPropertyOptional({
    description: 'Budget end date (null = ongoing)',
    example: '2025-12-31T00:00:00.000Z',
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Categories tracked by this budget',
    type: () => [CategoryDto],
  })
  @Type(() => CategoryDto)
  categories: CategoryDto[];

  @ApiProperty({ description: 'Owner user', type: () => UserDto })
  @Type(() => UserDto)
  user: UserDto;
}
