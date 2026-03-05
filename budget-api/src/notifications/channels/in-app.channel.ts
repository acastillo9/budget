import { Injectable, Logger } from '@nestjs/common';
import { ChannelStrategy } from './channel-strategy.interface';
import { NotificationEvent } from '../services/notification-event.interface';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class InAppChannel implements ChannelStrategy {
  private readonly logger: Logger = new Logger(InAppChannel.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async send(event: NotificationEvent): Promise<void> {
    try {
      await this.notificationsService.create(
        {
          type: event.type,
          title: event.title,
          message: event.message,
          data: {
            ...event.data,
            ...(event.deduplicationKey
              ? { deduplicationKey: event.deduplicationKey }
              : {}),
          },
          actionUrl: event.actionUrl,
        },
        event.userId,
        event.workspaceId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send in-app notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
