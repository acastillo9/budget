import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from './entities/notification.entity';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './entities/notification-preference.entity';
import {
  NotificationLock,
  NotificationLockSchema,
} from './entities/notification-lock.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcher } from './services/notification-dispatcher.service';
import { NotificationLockService } from './services/notification-lock.service';
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { TransactionNotificationHandler } from './handlers/transaction-notification.handler';
import { WorkspaceNotificationHandler } from './handlers/workspace-notification.handler';
import { BillScannerJob } from './jobs/bill-scanner.job';
import { BudgetCheckerJob } from './jobs/budget-checker.job';
import { LowBalanceJob } from './jobs/low-balance.job';
import { MonthlySummaryJob } from './jobs/monthly-summary.job';
import { NotificationCleanupJob } from './jobs/notification-cleanup.job';
import { MailModule } from 'src/mail/mail.module';
import { UsersModule } from 'src/users/users.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { Bill, BillSchema } from 'src/bills/entities/bill.entity';
import { Budget, BudgetSchema } from 'src/budgets/entities/budget.entity';
import {
  Transaction,
  TransactionSchema,
} from 'src/transactions/entities/transaction.entity';
import { Account, AccountSchema } from 'src/accounts/entities/account.entity';
import {
  WorkspaceMember,
  WorkspaceMemberSchema,
} from 'src/workspaces/entities/workspace-member.entity';
import {
  Workspace,
  WorkspaceSchema,
} from 'src/workspaces/entities/workspace.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
      { name: NotificationLock.name, schema: NotificationLockSchema },
      { name: Bill.name, schema: BillSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Account.name, schema: AccountSchema },
      { name: WorkspaceMember.name, schema: WorkspaceMemberSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
    MailModule,
    UsersModule,
    CategoriesModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatcher,
    NotificationLockService,
    InAppChannel,
    EmailChannel,
    TransactionNotificationHandler,
    WorkspaceNotificationHandler,
    BillScannerJob,
    BudgetCheckerJob,
    LowBalanceJob,
    MonthlySummaryJob,
    NotificationCleanupJob,
  ],
  exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule {}
