import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { BudgetPeriod } from '../entities/budget-period.enum';

export class BudgetDto {
  id: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;

  @Type(() => CategoryDto)
  categories: CategoryDto[];

  @Type(() => UserDto)
  user: UserDto;
}
