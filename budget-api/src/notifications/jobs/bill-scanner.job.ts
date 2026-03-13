import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Bill } from 'src/bills/entities/bill.entity';
import { BillStatus } from 'src/bills/entities/bill-status.enum';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationLockService } from '../services/notification-lock.service';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../entities/notification-preference.entity';
import { NotificationType } from '../entities/notification-type.enum';
import { WorkspaceMember } from 'src/workspaces/entities/workspace-member.entity';

@Injectable()
export class BillScannerJob {
  private readonly logger: Logger = new Logger(BillScannerJob.name);

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly lockService: NotificationLockService,
    private readonly configService: ConfigService,
    @InjectModel(Bill.name) private readonly billModel: Model<Bill>,
    @InjectModel(NotificationPreference.name)
    private readonly prefsModel: Model<NotificationPreference>,
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
  ) {}

  @Cron(process.env.CRON_BILL_SCANNER || '0 8 * * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock('bill-scanner', 30);
    if (!locked) {
      this.logger.debug('Bill scanner lock not acquired, skipping');
      return;
    }

    let processed = 0;
    let dispatched = 0;

    try {
      const now = new Date();
      const lookaheadDays = 7;
      const rangeEnd = new Date(now);
      rangeEnd.setDate(rangeEnd.getDate() + lookaheadDays);

      const bills = await this.billModel.find({
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
      });

      // Group bills by workspace for batch loading
      const billsByWorkspace = new Map<string, typeof bills>();
      for (const bill of bills) {
        const wsId = bill.workspace?.toString();
        if (!wsId) continue;
        if (!billsByWorkspace.has(wsId)) {
          billsByWorkspace.set(wsId, []);
        }
        billsByWorkspace.get(wsId).push(bill);
      }

      for (const [workspaceId, workspaceBills] of billsByWorkspace) {
        // Batch-load members and preferences per workspace
        const members = await this.memberModel.find({
          workspace: workspaceId,
        });
        const memberUserIds = members
          .map((m) => (m.user?._id ?? m.user)?.toString())
          .filter(Boolean);
        const allPrefs = await this.prefsModel.find({
          user: { $in: memberUserIds },
          workspace: workspaceId,
        });
        const prefsMap = new Map<string, NotificationPreferenceDocument>();
        for (const pref of allPrefs) {
          prefsMap.set(pref.user?.toString(), pref);
        }

        for (const bill of workspaceBills) {
          processed++;
          try {
            const instances = bill.getInstances(
              new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              rangeEnd,
            );

            for (const instance of instances) {
              for (const member of members) {
                const userId = (member.user?._id ?? member.user)?.toString();
                if (!userId) continue;

                const prefs = prefsMap.get(userId);
                const billDueSoonDays = prefs?.billDueSoonDays || 3;
                const billName = instance.name || bill.name || 'Bill';
                const instanceDate = instance.dueDate;
                const dateStr = instanceDate.toISOString().split('T')[0];

                if (instance.status === BillStatus.OVERDUE) {
                  await this.dispatcher.dispatch({
                    type: NotificationType.BILL_OVERDUE,
                    userId,
                    workspaceId,
                    title: 'Bill Overdue',
                    message: `Your bill "${billName}" is overdue`,
                    data: { billId: bill._id.toString() },
                    actionUrl: '/bills',
                    deduplicationKey: `bill_overdue_${bill._id}_${dateStr}_${now.toISOString().split('T')[0]}`,
                    emailTemplate: 'billOverdue',
                    emailContext: {
                      billName,
                      amount: (instance.amount || bill.amount).toFixed(2),
                      dueDate: dateStr,
                    },
                  });
                  dispatched++;
                }

                if (
                  instance.status === BillStatus.UPCOMING ||
                  instance.status === BillStatus.DUE
                ) {
                  const daysUntilDue = Math.ceil(
                    (instanceDate.getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  if (daysUntilDue >= 0 && daysUntilDue <= billDueSoonDays) {
                    await this.dispatcher.dispatch({
                      type: NotificationType.BILL_DUE_SOON,
                      userId,
                      workspaceId,
                      title: 'Bill Due Soon',
                      message: `Your bill "${billName}" is due in ${daysUntilDue} day(s)`,
                      data: { billId: bill._id.toString() },
                      actionUrl: '/bills',
                      deduplicationKey: `bill_due_soon_${bill._id}_${dateStr}`,
                      emailTemplate: 'billDueSoon',
                      emailContext: {
                        billName,
                        amount: (instance.amount || bill.amount).toFixed(2),
                        dueDate: dateStr,
                        daysUntilDue: daysUntilDue.toString(),
                      },
                    });
                    dispatched++;
                  }
                }
              }
            }

            // Check for recurring bills ending soon
            if (bill.endDate) {
              const daysUntilEnd = Math.ceil(
                (bill.endDate.getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              if (daysUntilEnd >= 0 && daysUntilEnd <= 7) {
                for (const member of members) {
                  const userId = (member.user?._id ?? member.user)?.toString();
                  if (!userId) continue;
                  await this.dispatcher.dispatch({
                    type: NotificationType.RECURRING_BILL_ENDING,
                    userId,
                    workspaceId,
                    title: 'Recurring Bill Ending',
                    message: `Your recurring bill "${bill.name}" ends in ${daysUntilEnd} day(s)`,
                    data: { billId: bill._id.toString() },
                    actionUrl: '/bills',
                    deduplicationKey: `recurring_ending_${bill._id}_${bill.endDate.toISOString().split('T')[0]}`,
                    emailTemplate: 'recurringBillEnding',
                    emailContext: {
                      billName: bill.name,
                      endDate: bill.endDate.toISOString().split('T')[0],
                    },
                  });
                  dispatched++;
                }
              }
            }
          } catch (error) {
            this.logger.error(
              `Error processing bill ${bill._id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Bill scanner completed: ${processed} bills processed, ${dispatched} notifications dispatched in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Bill scanner failed: ${error.message}`, error.stack);
    } finally {
      await this.lockService.releaseLock('bill-scanner');
    }
  }
}
