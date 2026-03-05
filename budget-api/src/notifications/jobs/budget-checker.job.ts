import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget } from 'src/budgets/entities/budget.entity';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationLockService } from '../services/notification-lock.service';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../entities/notification-preference.entity';
import { NotificationType } from '../entities/notification-type.enum';
import { WorkspaceMember } from 'src/workspaces/entities/workspace-member.entity';
import { ObjectId } from 'mongodb';
import { CategoriesService } from 'src/categories/categories.service';
import { getPeriodStart, addPeriod } from '../utils/period.util';

@Injectable()
export class BudgetCheckerJob {
  private readonly logger: Logger = new Logger(BudgetCheckerJob.name);

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly lockService: NotificationLockService,
    @InjectModel(Budget.name) private readonly budgetModel: Model<Budget>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(NotificationPreference.name)
    private readonly prefsModel: Model<NotificationPreference>,
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Cron(process.env.CRON_BUDGET_CHECKER || '0 */6 * * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock('budget-checker', 30);
    if (!locked) {
      this.logger.debug('Budget checker lock not acquired, skipping');
      return;
    }

    let processed = 0;
    let dispatched = 0;

    try {
      const budgets = await this.budgetModel.find({
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      // Group budgets by workspace for batch loading
      const budgetsByWorkspace = new Map<string, typeof budgets>();
      for (const budget of budgets) {
        const wsId = budget.workspace?.toString();
        if (!wsId) continue;
        if (!budgetsByWorkspace.has(wsId)) {
          budgetsByWorkspace.set(wsId, []);
        }
        budgetsByWorkspace.get(wsId).push(budget);
      }

      for (const [workspaceId, workspaceBudgets] of budgetsByWorkspace) {
        // Batch-load members and preferences per workspace
        const members = await this.memberModel.find({
          workspace: workspaceId,
        });
        const memberUserIds = members
          .map((m) => m.user?.toString())
          .filter(Boolean);
        const allPrefs = await this.prefsModel.find({
          user: { $in: memberUserIds },
          workspace: workspaceId,
        });
        const prefsMap = new Map<string, NotificationPreferenceDocument>();
        for (const pref of allPrefs) {
          prefsMap.set(pref.user?.toString(), pref);
        }

        for (const budget of workspaceBudgets) {
          processed++;
          try {
            const budgetCategoryIds =
              await this.categoriesService.findCategoryIdsWithChildren(
                budget.categories.map((c) =>
                  typeof c === 'object' && c._id
                    ? c._id.toString()
                    : c.toString(),
                ),
                workspaceId,
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
                  workspace: new ObjectId(workspaceId),
                  category: {
                    $in: budgetCategoryIds.map((id) => new ObjectId(id)),
                  },
                  date: { $gte: periodStart, $lt: periodEnd },
                  isTransfer: false,
                },
              },
              {
                $group: { _id: null, total: { $sum: { $abs: '$amount' } } },
              },
            ]);

            const spent = result[0]?.total || 0;
            const percentUsed =
              budget.amount > 0
                ? Math.round((spent / budget.amount) * 10000) / 100
                : 0;

            const budgetName = (budget as { name?: string }).name || 'Budget';

            for (const member of members) {
              const userId = member.user?.toString();
              if (!userId) continue;

              const prefs = prefsMap.get(userId);
              const thresholdPercent = prefs?.budgetThresholdPercent || 80;

              if (percentUsed >= 100) {
                await this.dispatcher.dispatch({
                  type: NotificationType.BUDGET_EXCEEDED,
                  userId,
                  workspaceId,
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
                dispatched++;
              } else if (percentUsed >= thresholdPercent) {
                await this.dispatcher.dispatch({
                  type: NotificationType.BUDGET_THRESHOLD,
                  userId,
                  workspaceId,
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
                dispatched++;
              }
            }
          } catch (error) {
            this.logger.error(
              `Error processing budget ${budget._id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Budget checker completed: ${processed} budgets processed, ${dispatched} notifications dispatched in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Budget checker failed: ${error.message}`, error.stack);
    } finally {
      await this.lockService.releaseLock('budget-checker');
    }
  }
}
