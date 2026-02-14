import { Category } from 'src/categories/entities/category.entity';
import { BudgetPeriod } from './budget-period.enum';

/**
 * Virtual entity representing the budget progress for a specific period window.
 * Not persisted — computed at query time by aggregating transactions.
 */
export class BudgetProgress {
  budgetId: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;
  spent: number;
  remaining: number;
  percentUsed: number;
  categories: Category[];
}
