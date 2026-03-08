import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationType } from '../entities/notification-type.enum';
import { Budget } from 'src/budgets/entities/budget.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { Account } from 'src/accounts/entities/account.entity';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../entities/notification-preference.entity';
import { ObjectId } from 'mongodb';
import { CategoriesService } from 'src/categories/categories.service';
import { getPeriodStart, addPeriod } from '../utils/period.util';
import { getThresholdForCurrency } from '../constants/currency-thresholds';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export interface TransactionCreatedEvent {
  transaction: any;
  userId: string;
  workspaceId: string;
  accountId: string;
  categoryId: string;
  amount: number;
}

@Injectable()
export class TransactionNotificationHandler {
  private readonly logger: Logger = new Logger(
    TransactionNotificationHandler.name,
  );

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    @InjectModel(Budget.name) private readonly budgetModel: Model<Budget>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(NotificationPreference.name)
    private readonly prefsModel: Model<NotificationPreference>,
    private readonly categoriesService: CategoriesService,
  ) {}

  @OnEvent('transaction.created')
  async handleTransactionCreated(
    event: TransactionCreatedEvent,
  ): Promise<void> {
    try {
      // Query preferences and account once, pass to all check methods
      const [prefs, account] = await Promise.all([
        this.prefsModel.findOne({
          user: event.userId,
          workspace: event.workspaceId,
        }),
        event.accountId ? this.accountModel.findById(event.accountId) : null,
      ]);

      await Promise.allSettled([
        this.checkBudgetThresholds(event, prefs),
        this.checkLargeTransaction(event, prefs, account),
        this.checkLowBalance(event, prefs, account),
      ]);
    } catch (error) {
      this.logger.error(
        `Error handling transaction.created: ${error.message}`,
        error.stack,
      );
    }
  }

  private async checkBudgetThresholds(
    event: TransactionCreatedEvent,
    prefs: NotificationPreferenceDocument | null,
  ): Promise<void> {
    try {
      if (!event.categoryId || !event.workspaceId) return;

      const expandedIds =
        await this.categoriesService.findCategoryIdsWithChildren(
          [event.categoryId],
          event.workspaceId,
        );

      const budgets = await this.budgetModel.find({
        workspace: event.workspaceId,
        categories: { $in: expandedIds },
      });

      if (budgets.length === 0) return;

      const thresholdPercent = prefs?.budgetThresholdPercent || 80;

      for (const budget of budgets) {
        const budgetCategoryIds =
          await this.categoriesService.findCategoryIdsWithChildren(
            budget.categories.map((c) =>
              typeof c === 'object' && c._id ? c._id.toString() : c.toString(),
            ),
            event.workspaceId,
          );

        const now = new Date();
        const periodStart = getPeriodStart(
          budget.startDate,
          budget.period as string,
          now,
        );
        const periodEnd = addPeriod(periodStart, budget.period as string);

        const result = await this.transactionModel.aggregate([
          {
            $match: {
              workspace: new ObjectId(event.workspaceId),
              category: {
                $in: budgetCategoryIds.map((id) => new ObjectId(id)),
              },
              date: { $gte: periodStart, $lt: periodEnd },
              isTransfer: false,
            },
          },
          { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
        ]);

        const spent = result[0]?.total || 0;
        const percentUsed =
          budget.amount > 0
            ? Math.round((spent / budget.amount) * 10000) / 100
            : 0;

        const budgetName = (budget as { name?: string }).name || 'Budget';

        if (percentUsed >= 100) {
          await this.dispatcher.dispatch({
            type: NotificationType.BUDGET_EXCEEDED,
            userId: event.userId,
            workspaceId: event.workspaceId,
            title: 'Budget Exceeded',
            message: `Your budget "${budgetName}" has been exceeded (${percentUsed}% used)`,
            data: { budgetId: budget._id.toString() },
            actionUrl: '/budgets',
            deduplicationKey: `budget_exceeded_${budget._id}_${periodStart.toISOString().split('T')[0]}`,
            emailTemplate: 'budgetExceeded',
            emailContext: {
              budgetName,
              spent: spent.toFixed(2),
              limit: budget.amount.toFixed(2),
              percentUsed: percentUsed.toFixed(1),
            },
          });
        } else if (percentUsed >= thresholdPercent) {
          await this.dispatcher.dispatch({
            type: NotificationType.BUDGET_THRESHOLD,
            userId: event.userId,
            workspaceId: event.workspaceId,
            title: 'Budget Threshold Reached',
            message: `Your budget "${budgetName}" has reached ${percentUsed}% of the limit`,
            data: { budgetId: budget._id.toString() },
            actionUrl: '/budgets',
            deduplicationKey: `budget_threshold_${budget._id}_${periodStart.toISOString().split('T')[0]}`,
            emailTemplate: 'budgetThreshold',
            emailContext: {
              budgetName,
              spent: spent.toFixed(2),
              limit: budget.amount.toFixed(2),
              percentUsed: percentUsed.toFixed(1),
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking budget thresholds: ${error.message}`,
        error.stack,
      );
    }
  }

  private async checkLargeTransaction(
    event: TransactionCreatedEvent,
    prefs: NotificationPreferenceDocument | null,
    account: any,
  ): Promise<void> {
    try {
      const currencyCode =
        (account?.currencyCode as CurrencyCode) || CurrencyCode.USD;
      const threshold = getThresholdForCurrency(
        prefs?.largeTransactionAmounts,
        currencyCode,
        'largeTransactionAmount',
      );

      if (Math.abs(event.amount) >= threshold) {
        await this.dispatcher.dispatch({
          type: NotificationType.LARGE_TRANSACTION,
          userId: event.userId,
          workspaceId: event.workspaceId,
          title: 'Large Transaction',
          message: `A large transaction of ${Math.abs(event.amount).toFixed(2)} was recorded`,
          data: {
            transactionId:
              event.transaction._id?.toString() || event.transaction.id,
          },
          actionUrl: '/transactions',
          deduplicationKey: `large_tx_${event.transaction._id?.toString() || event.transaction.id}`,
          emailTemplate: 'largeTransaction',
          emailContext: {
            amount: Math.abs(event.amount).toFixed(2),
            description: event.transaction.description || '',
            accountName: event.transaction.account?.name || '',
            date: new Date().toISOString().split('T')[0],
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error checking large transaction: ${error.message}`,
        error.stack,
      );
    }
  }

  private async checkLowBalance(
    event: TransactionCreatedEvent,
    prefs: NotificationPreferenceDocument | null,
    account: any,
  ): Promise<void> {
    try {
      if (!event.accountId || !account) return;

      const currencyCode =
        (account.currencyCode as CurrencyCode) || CurrencyCode.USD;
      const threshold = getThresholdForCurrency(
        prefs?.lowBalanceAmounts,
        currencyCode,
        'lowBalanceAmount',
      );

      if (account.balance < threshold) {
        const accountName = account.name || 'Account';
        await this.dispatcher.dispatch({
          type: NotificationType.LOW_BALANCE,
          userId: event.userId,
          workspaceId: event.workspaceId,
          title: 'Low Account Balance',
          message: `Your account "${accountName}" balance is ${account.balance.toFixed(2)}, below the ${threshold.toFixed(2)} threshold`,
          data: { accountId: event.accountId },
          actionUrl: '/accounts',
          deduplicationKey: `low_balance_${event.accountId}_${new Date().toISOString().split('T')[0]}`,
          emailTemplate: 'lowBalance',
          emailContext: {
            accountName,
            balance: account.balance.toFixed(2),
            threshold: threshold.toFixed(2),
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error checking low balance: ${error.message}`,
        error.stack,
      );
    }
  }
}
