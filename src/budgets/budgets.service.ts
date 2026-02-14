import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget } from './entities/budget.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetDto } from './dto/budget.dto';
import { BudgetProgressDto } from './dto/budget-progress.dto';
import { BudgetPeriod } from './entities/budget-period.enum';
import { plainToClass } from 'class-transformer';
import { ObjectId } from 'mongodb';

@Injectable()
export class BudgetsService {
  private readonly logger: Logger = new Logger(BudgetsService.name);

  constructor(
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<Budget>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  /**
   * Create a new budget.
   * @param createBudgetDto The data to create the budget.
   * @param userId The id of the user creating the budget.
   * @returns The budget created.
   * @async
   */
  async create(
    createBudgetDto: CreateBudgetDto,
    userId: string,
  ): Promise<BudgetDto> {
    await this.validateCategoryUniqueness(
      createBudgetDto.categories,
      createBudgetDto.period,
      userId,
    );

    try {
      const budgetModel = new this.budgetModel({
        ...createBudgetDto,
        user: userId,
      });
      const savedBudget = await budgetModel.save();
      return plainToClass(BudgetDto, savedBudget.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to create budget: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the budget',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all budgets of a user.
   * @param userId The id of the user.
   * @returns The budgets found.
   * @async
   */
  async findAll(userId: string): Promise<BudgetDto[]> {
    try {
      const budgets = await this.budgetModel
        .find({ user: userId })
        .sort({ createdAt: -1 });
      return budgets.map((budget) =>
        plainToClass(BudgetDto, budget.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find budgets: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the budgets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a budget by id.
   * @param id The id of the budget.
   * @param userId The id of the user.
   * @returns The budget found.
   * @async
   */
  async findById(id: string, userId: string): Promise<BudgetDto> {
    try {
      const budget = await this.budgetModel.findOne({
        _id: id,
        user: userId,
      });
      if (!budget) {
        throw new HttpException('Budget not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(BudgetDto, budget.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to find budget: ${error.message}`, error.stack);
      throw new HttpException(
        'Error finding the budget',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a budget by id.
   * @param id The id of the budget to update.
   * @param updateBudgetDto The data to update the budget.
   * @param userId The id of the user.
   * @returns The budget updated.
   * @async
   */
  async update(
    id: string,
    updateBudgetDto: UpdateBudgetDto,
    userId: string,
  ): Promise<BudgetDto> {
    if (updateBudgetDto.categories || updateBudgetDto.period) {
      const existing = await this.findById(id, userId);
      const categories =
        updateBudgetDto.categories || existing.categories.map((c) => c.id);
      const period = updateBudgetDto.period || existing.period;
      await this.validateCategoryUniqueness(categories, period, userId, id);
    }

    try {
      const updatedBudget = await this.budgetModel.findOneAndUpdate(
        { _id: id, user: userId },
        updateBudgetDto,
        { new: true },
      );
      if (!updatedBudget) {
        throw new HttpException('Budget not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(BudgetDto, updatedBudget.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update budget: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the budget',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove a budget by id.
   * @param id The id of the budget to remove.
   * @param userId The id of the user.
   * @returns The budget removed.
   * @async
   */
  async remove(id: string, userId: string): Promise<BudgetDto> {
    try {
      const deletedBudget = await this.budgetModel.findOneAndDelete({
        _id: id,
        user: userId,
      });
      if (!deletedBudget) {
        throw new HttpException('Budget not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(BudgetDto, deletedBudget.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove budget: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the budget',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the budget progress for a specific budget over a date range.
   * Returns one BudgetProgressDto per period window within the range.
   * @param id The id of the budget.
   * @param userId The id of the user.
   * @param from Optional start date for the range (defaults to budget startDate).
   * @param to Optional end date for the range (defaults to now).
   * @returns Array of budget progress for each period window.
   * @async
   */
  async getProgress(
    id: string,
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<BudgetProgressDto[]> {
    const budget = await this.findById(id, userId);
    const budgetStart = new Date(budget.startDate);
    const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;

    const rangeStart = from && from > budgetStart ? from : budgetStart;
    const rangeEnd = to || new Date();

    // Cap rangeEnd at budget endDate if set
    const effectiveEnd =
      budgetEnd && budgetEnd < rangeEnd ? budgetEnd : rangeEnd;

    const windows = this.generatePeriodWindows(
      budgetStart,
      budget.period,
      rangeStart,
      effectiveEnd,
    );

    if (windows.length === 0) {
      return [];
    }

    // Get category IDs for the aggregation query
    const categoryIds = budget.categories.map((c) => new ObjectId(c.id));

    // Aggregate all spending in one query across the full range
    const globalStart = windows[0].start;
    const globalEnd = windows[windows.length - 1].end;

    const spentByPeriod = await this.aggregateSpentByWindows(
      categoryIds,
      userId,
      globalStart,
      globalEnd,
      windows,
    );

    return windows.map((window, index) => {
      const spent = spentByPeriod[index] || 0;
      const remaining = budget.amount - spent;
      const percentUsed =
        budget.amount > 0
          ? Math.round((spent / budget.amount) * 10000) / 100
          : 0;

      return plainToClass(BudgetProgressDto, {
        budgetId: budget.id,
        name: budget.name,
        amount: budget.amount,
        period: budget.period,
        periodStart: window.start,
        periodEnd: window.end,
        spent,
        remaining,
        percentUsed,
        categories: budget.categories,
      });
    });
  }

  /**
   * Validate that no category appears in more than one budget
   * for the same user and period.
   * @param categoryIds Category IDs to validate.
   * @param period The budget period.
   * @param userId The user ID.
   * @param excludeBudgetId Optional budget ID to exclude (for updates).
   */
  private async validateCategoryUniqueness(
    categoryIds: string[],
    period: BudgetPeriod,
    userId: string,
    excludeBudgetId?: string,
  ): Promise<void> {
    const filter: any = {
      user: userId,
      period,
      categories: { $in: categoryIds },
    };
    if (excludeBudgetId) {
      filter._id = { $ne: excludeBudgetId };
    }

    const conflicting = await this.budgetModel.findOne(filter);
    if (conflicting) {
      throw new HttpException(
        'One or more categories are already assigned to another budget with the same period',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Generate period windows between rangeStart and rangeEnd,
   * aligned to the budget's startDate and period.
   * @param budgetStart The budget start date (anchor).
   * @param period The budget period.
   * @param rangeStart Start of the query range.
   * @param rangeEnd End of the query range.
   * @returns Array of { start, end } period windows.
   */
  private generatePeriodWindows(
    budgetStart: Date,
    period: BudgetPeriod,
    rangeStart: Date,
    rangeEnd: Date,
  ): { start: Date; end: Date }[] {
    const windows: { start: Date; end: Date }[] = [];
    let windowStart = new Date(budgetStart);

    // Advance windowStart to the first window that overlaps with rangeStart
    while (true) {
      const windowEnd = this.addPeriod(windowStart, period);
      if (windowEnd > rangeStart) {
        break;
      }
      windowStart = windowEnd;
    }

    // Generate windows until we pass rangeEnd
    while (windowStart < rangeEnd) {
      const windowEnd = this.addPeriod(windowStart, period);
      windows.push({
        start: new Date(windowStart),
        end: new Date(windowEnd),
      });
      windowStart = windowEnd;
    }

    return windows;
  }

  /**
   * Add one period to a date.
   * @param date The starting date.
   * @param period The budget period to add.
   * @returns A new date advanced by one period.
   */
  private addPeriod(date: Date, period: BudgetPeriod): Date {
    const result = new Date(date);
    switch (period) {
      case BudgetPeriod.WEEKLY:
        result.setDate(result.getDate() + 7);
        break;
      case BudgetPeriod.MONTHLY:
        result.setMonth(result.getMonth() + 1);
        break;
      case BudgetPeriod.YEARLY:
        result.setFullYear(result.getFullYear() + 1);
        break;
    }
    return result;
  }

  /**
   * Aggregate the total spent amount for each period window.
   * Uses a single MongoDB aggregation pipeline to compute all windows at once.
   * @param categoryIds The category ObjectIds to match.
   * @param userId The user ID.
   * @param globalStart The earliest window start.
   * @param globalEnd The latest window end.
   * @param windows The period windows.
   * @returns A map from window index to spent amount.
   */
  private async aggregateSpentByWindows(
    categoryIds: ObjectId[],
    userId: string,
    globalStart: Date,
    globalEnd: Date,
    windows: { start: Date; end: Date }[],
  ): Promise<Record<number, number>> {
    try {
      // Fetch all matching transactions in the date range
      const transactions = await this.transactionModel.aggregate([
        {
          $match: {
            user: new ObjectId(userId),
            category: { $in: categoryIds },
            date: { $gte: globalStart, $lt: globalEnd },
            isTransfer: false,
          },
        },
        {
          $project: {
            amount: 1,
            date: 1,
          },
        },
      ]);

      // Distribute transactions into windows
      const spentByPeriod: Record<number, number> = {};
      for (const tx of transactions) {
        for (let i = 0; i < windows.length; i++) {
          if (tx.date >= windows[i].start && tx.date < windows[i].end) {
            // Expenses are stored as negative amounts; take absolute value
            spentByPeriod[i] = (spentByPeriod[i] || 0) + Math.abs(tx.amount);
            break;
          }
        }
      }

      return spentByPeriod;
    } catch (error) {
      this.logger.error(
        `Failed to aggregate budget progress: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error computing budget progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
