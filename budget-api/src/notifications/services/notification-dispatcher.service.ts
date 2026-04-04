import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { NotificationEvent } from './notification-event.interface';
import { NotificationsService } from '../notifications.service';
import { InAppChannel } from '../channels/in-app.channel';
import { EmailChannel } from '../channels/email.channel';
import { EmailDailyCount } from '../entities/email-daily-count.entity';
import { DigestQueue } from '../entities/digest-queue.entity';

@Injectable()
export class NotificationDispatcher {
  private readonly logger: Logger = new Logger(NotificationDispatcher.name);
  private readonly emailDailyCap: number;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    @InjectModel(EmailDailyCount.name)
    private readonly emailDailyCountModel: Model<EmailDailyCount>,
    @InjectModel(DigestQueue.name)
    private readonly digestQueueModel: Model<DigestQueue>,
    private readonly configService: ConfigService,
  ) {
    this.emailDailyCap = parseInt(
      this.configService.get<string>('EMAIL_DAILY_CAP', '5'),
      10,
    );
  }

  async dispatch(event: NotificationEvent): Promise<void> {
    try {
      // 1. Resolve user preferences
      const prefs = await this.notificationsService.getPreferences(
        event.userId,
        event.workspaceId,
      );

      const channelConfig = prefs.channels?.[event.type];
      if (!channelConfig) {
        this.logger.debug(
          `No channel config for type ${event.type}, using defaults`,
        );
      }

      const inAppEnabled = channelConfig?.inApp ?? true;
      const emailEnabled = channelConfig?.email ?? false;

      // 2. Check deduplication
      if (event.deduplicationKey) {
        const isDuplicate = await this.notificationsService.findDuplicateKey(
          event.userId,
          event.workspaceId,
          event.type,
          event.deduplicationKey,
        );
        if (isDuplicate) {
          this.logger.debug(
            `Duplicate notification skipped: ${event.deduplicationKey}`,
          );
          return;
        }
      }

      // 3. Check quiet hours for email
      const isQuietHours = this.isInQuietHours(
        prefs.quietHoursEnabled,
        prefs.quietHoursStart,
        prefs.quietHoursEnd,
        prefs.quietHoursTimezone,
      );

      // 4. Dispatch to enabled channels (errors isolated per channel)
      if (inAppEnabled) {
        try {
          await this.inAppChannel.send(event);
        } catch (error) {
          this.logger.error(
            `In-app channel failed: ${error.message}`,
            error.stack,
          );
        }
      }

      if (emailEnabled && !isQuietHours) {
        if (prefs.emailDeliveryMode === 'daily_digest') {
          try {
            await this.digestQueueModel.create({
              user: event.userId,
              workspace: event.workspaceId,
              type: event.type,
              title: event.title,
              message: event.message,
              data: event.data,
              actionUrl: event.actionUrl,
            });
          } catch (error) {
            this.logger.error(
              `Failed to queue digest item: ${error.message}`,
              error.stack,
            );
          }
        } else {
          const withinCap = await this.checkDailyCap(event.userId);
          if (withinCap) {
            try {
              await this.emailChannel.send(event);
            } catch (error) {
              this.logger.error(
                `Email channel failed: ${error.message}`,
                error.stack,
              );
            }
          } else {
            this.logger.debug(
              `Daily email cap reached for user ${event.userId}, skipping email`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch notification: ${error.message}`,
        error.stack,
      );
    }
  }

  private async checkDailyCap(userId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.emailDailyCountModel.findOneAndUpdate(
        { user: userId, date: today },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true },
      );
      return result.count <= this.emailDailyCap;
    } catch (error) {
      this.logger.warn(
        `Failed to check daily email cap: ${error.message}, proceeding with send`,
      );
      return true;
    }
  }

  private isInQuietHours(
    enabled: boolean,
    start: string,
    end: string,
    timezone: string,
  ): boolean {
    if (!enabled) return false;

    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const currentTime = formatter.format(now);

      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Handle cross-midnight ranges (e.g., 22:00 - 08:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } catch (error) {
      this.logger.warn(
        `Failed to check quiet hours: ${error.message}, proceeding without quiet hours`,
      );
      return false;
    }
  }
}
