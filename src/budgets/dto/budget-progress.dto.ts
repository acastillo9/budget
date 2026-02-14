import { Type } from 'class-transformer';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { BudgetPeriod } from '../entities/budget-period.enum';

export class BudgetProgressDto {
  budgetId: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;
  spent: number;
  remaining: number;
  percentUsed: number;

  @Type(() => CategoryDto)
  categories: CategoryDto[];
}
