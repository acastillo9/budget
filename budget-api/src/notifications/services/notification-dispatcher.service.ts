import { Injectable, Logger } from '@nestjs/common';
import { NotificationEvent } from './notification-event.interface';
import { NotificationsService } from '../notifications.service';
import { InAppChannel } from '../channels/in-app.channel';
import { EmailChannel } from '../channels/email.channel';

@Injectable()
export class NotificationDispatcher {
  private readonly logger: Logger = new Logger(NotificationDispatcher.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
  ) {}

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
        try {
          await this.emailChannel.send(event);
        } catch (error) {
          this.logger.error(
            `Email channel failed: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch notification: ${error.message}`,
        error.stack,
      );
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
