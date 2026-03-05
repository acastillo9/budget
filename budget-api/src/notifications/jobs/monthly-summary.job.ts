import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationLockService } from '../services/notification-lock.service';
import { NotificationType } from '../entities/notification-type.enum';
import { WorkspaceMember } from 'src/workspaces/entities/workspace-member.entity';
import { Workspace } from 'src/workspaces/entities/workspace.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class MonthlySummaryJob {
  private readonly logger: Logger = new Logger(MonthlySummaryJob.name);

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly lockService: NotificationLockService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<Workspace>,
  ) {}

  @Cron(process.env.CRON_MONTHLY_SUMMARY || '0 10 1 * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock('monthly-summary', 60);
    if (!locked) {
      this.logger.debug('Monthly summary lock not acquired, skipping');
      return;
    }

    let dispatched = 0;

    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthName = lastMonth.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      const workspaces = await this.workspaceModel.find({});

      for (const workspace of workspaces) {
        try {
          const workspaceId = workspace._id.toString();

          const result = await this.transactionModel.aggregate([
            {
              $match: {
                workspace: new ObjectId(workspaceId),
                date: { $gte: lastMonth, $lt: monthEnd },
                isTransfer: false,
              },
            },
            {
              $group: {
                _id: null,
                totalIncome: {
                  $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
                },
                totalExpenses: {
                  $sum: {
                    $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0],
                  },
                },
              },
            },
          ]);

          const totalIncome = result[0]?.totalIncome || 0;
          const totalExpenses = result[0]?.totalExpenses || 0;
          const netSavings = totalIncome - totalExpenses;

          const members = await this.memberModel.find({
            workspace: workspaceId,
          });

          for (const member of members) {
            const userId = member.user?.toString();
            if (!userId) continue;

            const message =
              totalIncome === 0 && totalExpenses === 0
                ? `Your monthly summary for ${monthName}: No activity this month`
                : `Your monthly summary for ${monthName}: Income ${totalIncome.toFixed(2)}, Expenses ${totalExpenses.toFixed(2)}, Net ${netSavings.toFixed(2)}`;

            await this.dispatcher.dispatch({
              type: NotificationType.MONTHLY_SUMMARY,
              userId,
              workspaceId,
              title: 'Monthly Summary',
              message,
              actionUrl: '/transactions',
              deduplicationKey: `monthly_summary_${workspaceId}_${lastMonth.toISOString().split('T')[0]}`,
              emailTemplate: 'monthlySummary',
              emailContext: {
                month: monthName,
                totalIncome: totalIncome.toFixed(2),
                totalExpenses: totalExpenses.toFixed(2),
                netSavings: netSavings.toFixed(2),
              },
            });
            dispatched++;
          }
        } catch (error) {
          this.logger.error(
            `Error processing workspace ${workspace._id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Monthly summary completed: ${dispatched} notifications dispatched in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Monthly summary failed: ${error.message}`,
        error.stack,
      );
    } finally {
      await this.lockService.releaseLock('monthly-summary');
    }
  }
}
