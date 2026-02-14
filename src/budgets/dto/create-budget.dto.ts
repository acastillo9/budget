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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  categories: string[];
}
