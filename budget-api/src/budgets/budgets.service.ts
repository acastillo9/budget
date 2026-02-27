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
import { CategoriesService } from 'src/categories/categories.service';

@Injectable()
export class BudgetsService {
  private readonly logger: Logger = new Logger(BudgetsService.name);

  constructor(
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<Budget>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    createBudgetDto: CreateBudgetDto,
    userId: string,
    workspaceId: string,
  ): Promise<BudgetDto> {
    await this.validateCategoryUniqueness(
      createBudgetDto.categories,
      createBudgetDto.period,
      workspaceId,
    );

    try {
      const budgetModel = new this.budgetModel({
        ...createBudgetDto,
        user: userId,
        workspace: workspaceId,
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

  async findAll(workspaceId: string): Promise<BudgetDto[]> {
    try {
      const budgets = await this.budgetModel
        .find({ workspace: workspaceId })
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

  async findById(id: string, workspaceId: string): Promise<BudgetDto> {
    try {
      const budget = await this.budgetModel.findOne({
        _id: id,
        workspace: workspaceId,
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

  async update(
    id: string,
    updateBudgetDto: UpdateBudgetDto,
    workspaceId: string,
  ): Promise<BudgetDto> {
    if (updateBudgetDto.categories || updateBudgetDto.period) {
      const existing = await this.findById(id, workspaceId);
      const categories =
        updateBudgetDto.categories || existing.categories.map((c) => c.id);
      const period = updateBudgetDto.period || existing.period;
      await this.validateCategoryUniqueness(
        categories,
        period,
        workspaceId,
        id,
      );
    }

    try {
      const updatedBudget = await this.budgetModel.findOneAndUpdate(
        { _id: id, workspace: workspaceId },
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

  async remove(id: string, workspaceId: string): Promise<BudgetDto> {
    try {
      const deletedBudget = await this.budgetModel.findOneAndDelete({
        _id: id,
        workspace: workspaceId,
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

  async getProgress(
    id: string,
    workspaceId: string,
    from?: Date,
    to?: Date,
  ): Promise<BudgetProgressDto[]> {
    const budget = await this.findById(id, workspaceId);
    const budgetStart = new Date(budget.startDate);
    const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;

    const rangeStart = from && from > budgetStart ? from : budgetStart;
    const rangeEnd = to || new Date();

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

    const baseCategoryIds = budget.categories.map((c) => c.id);
    const expandedIds =
      await this.categoriesService.findCategoryIdsWithChildren(
        baseCategoryIds,
        workspaceId,
      );
    const categoryIds = expandedIds.map((id) => new ObjectId(id));

    const globalStart = windows[0].start;
    const globalEnd = windows[windows.length - 1].end;

    const spentByPeriod = await this.aggregateSpentByWindows(
      categoryIds,
      workspaceId,
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

  private async validateCategoryUniqueness(
    categoryIds: string[],
    period: BudgetPeriod,
    workspaceId: string,
    excludeBudgetId?: string,
  ): Promise<void> {
    const expandedIds =
      await this.categoriesService.findCategoryIdsWithChildren(
        categoryIds,
        workspaceId,
      );

    const filter: any = {
      workspace: workspaceId,
      period,
      categories: { $in: expandedIds },
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

  private generatePeriodWindows(
    budgetStart: Date,
    period: BudgetPeriod,
    rangeStart: Date,
    rangeEnd: Date,
  ): { start: Date; end: Date }[] {
    const windows: { start: Date; end: Date }[] = [];
    let windowStart = new Date(budgetStart);

    while (true) {
      const windowEnd = this.addPeriod(windowStart, period);
      if (windowEnd > rangeStart) {
        break;
      }
      windowStart = windowEnd;
    }

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

  private async aggregateSpentByWindows(
    categoryIds: ObjectId[],
    workspaceId: string,
    globalStart: Date,
    globalEnd: Date,
    windows: { start: Date; end: Date }[],
  ): Promise<Record<number, number>> {
    try {
      const transactions = await this.transactionModel.aggregate([
        {
          $match: {
            workspace: new ObjectId(workspaceId),
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

      const spentByPeriod: Record<number, number> = {};
      for (const tx of transactions) {
        for (let i = 0; i < windows.length; i++) {
          if (tx.date >= windows[i].start && tx.date < windows[i].end) {
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
