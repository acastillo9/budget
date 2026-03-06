import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from 'src/accounts/entities/account.entity';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationLockService } from '../services/notification-lock.service';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../entities/notification-preference.entity';
import { NotificationType } from '../entities/notification-type.enum';
import { WorkspaceMember } from 'src/workspaces/entities/workspace-member.entity';
import { getThresholdForCurrency } from '../constants/currency-thresholds';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

@Injectable()
export class LowBalanceJob {
  private readonly logger: Logger = new Logger(LowBalanceJob.name);

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly lockService: NotificationLockService,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(NotificationPreference.name)
    private readonly prefsModel: Model<NotificationPreference>,
    @InjectModel(WorkspaceMember.name)
    private readonly memberModel: Model<WorkspaceMember>,
  ) {}

  @Cron(process.env.CRON_LOW_BALANCE || '0 9 * * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock('low-balance', 30);
    if (!locked) {
      this.logger.debug('Low balance lock not acquired, skipping');
      return;
    }

    let processed = 0;
    let dispatched = 0;

    try {
      const accounts = await this.accountModel.find({});

      // Group accounts by workspace for batch loading
      const accountsByWorkspace = new Map<string, typeof accounts>();
      for (const account of accounts) {
        const wsId = account.workspace?.toString();
        if (!wsId) continue;
        if (!accountsByWorkspace.has(wsId)) {
          accountsByWorkspace.set(wsId, []);
        }
        accountsByWorkspace.get(wsId).push(account);
      }

      for (const [workspaceId, workspaceAccounts] of accountsByWorkspace) {
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

        for (const account of workspaceAccounts) {
          processed++;
          try {
            for (const member of members) {
              const userId = member.user?.toString();
              if (!userId) continue;

              const prefs = prefsMap.get(userId);
              const currencyCode = (account.currencyCode as CurrencyCode) || CurrencyCode.USD;
              const threshold = getThresholdForCurrency(
                prefs?.lowBalanceAmounts,
                currencyCode,
                'lowBalanceAmount',
              );

              if (account.balance < threshold) {
                const accountName = account.name || 'Account';
                await this.dispatcher.dispatch({
                  type: NotificationType.LOW_BALANCE,
                  userId,
                  workspaceId,
                  title: 'Low Account Balance',
                  message: `Your account "${accountName}" balance is ${account.balance.toFixed(2)}, below the ${threshold.toFixed(2)} threshold`,
                  data: { accountId: account._id.toString() },
                  actionUrl: '/accounts',
                  deduplicationKey: `low_balance_${account._id}_${new Date().toISOString().split('T')[0]}`,
                  emailTemplate: 'lowBalance',
                  emailContext: {
                    accountName,
                    balance: account.balance.toFixed(2),
                    threshold: threshold.toFixed(2),
                  },
                });
                dispatched++;
              }
            }
          } catch (error) {
            this.logger.error(
              `Error processing account ${account._id}: ${error.message}`,
              error.stack,
            );
          }
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Low balance check completed: ${processed} accounts processed, ${dispatched} notifications dispatched in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Low balance check failed: ${error.message}`,
        error.stack,
      );
    } finally {
      await this.lockService.releaseLock('low-balance');
    }
  }
}
