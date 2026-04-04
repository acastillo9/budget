import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { DigestQueue } from '../entities/digest-queue.entity';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from '../entities/notification-preference.entity';
import { NotificationLockService } from '../services/notification-lock.service';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';
import { NotificationType } from '../entities/notification-type.enum';

interface DigestGroup {
  type: NotificationType;
  typeName: string;
  items: { title: string; message: string; actionUrl?: string }[];
}

@Injectable()
export class DigestSenderJob {
  private readonly logger: Logger = new Logger(DigestSenderJob.name);

  constructor(
    private readonly lockService: NotificationLockService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    @InjectModel(DigestQueue.name)
    private readonly digestQueueModel: Model<DigestQueue>,
    @InjectModel(NotificationPreference.name)
    private readonly prefsModel: Model<NotificationPreference>,
  ) {}

  @Cron(process.env.CRON_DIGEST_SENDER || '0 * * * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock('digest-sender', 30);
    if (!locked) {
      this.logger.debug('Digest sender lock not acquired, skipping');
      return;
    }

    let usersSent = 0;
    let totalItems = 0;

    try {
      // Find all users with digest mode enabled
      const digestPrefs = await this.prefsModel.find({
        emailDeliveryMode: 'daily_digest',
      });

      const now = new Date();

      for (const pref of digestPrefs) {
        try {
          const userId = pref.user?.toString();
          if (!userId) continue;

          // Check if current hour matches user's digest time
          if (!this.isDigestTime(pref, now)) continue;

          // Find unsent digest items for this user
          const items = await this.digestQueueModel
            .find({
              user: userId,
              sent: false,
            })
            .sort({ createdAt: -1 });

          if (items.length === 0) continue;

          // Group by notification type
          const groups = this.groupByType(items);

          // Send digest email
          const user = await this.usersService.findById(userId);
          if (!user || !user.email) {
            this.logger.warn(
              `User ${userId} not found or has no email, skipping digest`,
            );
            continue;
          }

          const lang = (user as any).language || 'en';
          const appUrl = this.configService.get(
            'APP_URL',
            'http://localhost:5173',
          );

          const subject = this.i18n.t('digest.subject', {
            lang,
            args: { count: items.length.toString() },
          });

          await this.mailService.sendMail({
            to: user.email,
            subject,
            template: 'digest',
            context: {
              groups,
              totalCount: items.length,
              actionLink: `${appUrl}/notifications`,
              i18nLang: lang,
              year: now.getFullYear(),
            },
          });

          // Mark items as sent
          await this.digestQueueModel.updateMany(
            { _id: { $in: items.map((i) => i._id) } },
            { $set: { sent: true } },
          );

          usersSent++;
          totalItems += items.length;
        } catch (error) {
          this.logger.error(
            `Error sending digest for user ${pref.user}: ${error.message}`,
            error.stack,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Digest sender completed: ${usersSent} users, ${totalItems} items in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Digest sender failed: ${error.message}`, error.stack);
    } finally {
      await this.lockService.releaseLock('digest-sender');
    }
  }

  private isDigestTime(
    pref: NotificationPreferenceDocument,
    now: Date,
  ): boolean {
    try {
      const timezone = pref.digestTimezone || 'UTC';
      const digestTime = pref.digestTime || '08:00';

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const currentTime = formatter.format(now);
      const [currentHour] = currentTime.split(':').map(Number);
      const [digestHour] = digestTime.split(':').map(Number);

      return currentHour === digestHour;
    } catch (error) {
      this.logger.warn(
        `Failed to check digest time: ${error.message}, skipping`,
      );
      return false;
    }
  }

  private groupByType(items: any[]): DigestGroup[] {
    const groupMap = new Map<string, DigestGroup>();

    for (const item of items) {
      const type = item.type as NotificationType;
      if (!groupMap.has(type)) {
        groupMap.set(type, {
          type,
          typeName: this.getTypeName(type),
          items: [],
        });
      }
      groupMap.get(type).items.push({
        title: item.title,
        message: item.message,
        actionUrl: item.actionUrl,
      });
    }

    return Array.from(groupMap.values());
  }

  private getTypeName(type: NotificationType): string {
    const names: Record<string, string> = {
      [NotificationType.BILL_OVERDUE]: 'Bill Overdue',
      [NotificationType.BILL_DUE_SOON]: 'Bill Due Soon',
      [NotificationType.BUDGET_THRESHOLD]: 'Budget Threshold',
      [NotificationType.BUDGET_EXCEEDED]: 'Budget Exceeded',
      [NotificationType.LOW_BALANCE]: 'Low Balance',
      [NotificationType.LARGE_TRANSACTION]: 'Large Transaction',
      [NotificationType.RECURRING_BILL_ENDING]: 'Recurring Bill Ending',
      [NotificationType.WORKSPACE_INVITATION]: 'Workspace Invitation',
      [NotificationType.MONTHLY_SUMMARY]: 'Monthly Summary',
    };
    return names[type] || type;
  }
}
