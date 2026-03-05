import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications.service';
import { NotificationLockService } from '../services/notification-lock.service';

@Injectable()
export class NotificationCleanupJob {
  private readonly logger: Logger = new Logger(NotificationCleanupJob.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly lockService: NotificationLockService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(process.env.CRON_NOTIFICATION_CLEANUP || '0 3 * * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock(
      'notification-cleanup',
      15,
    );
    if (!locked) {
      this.logger.debug('Notification cleanup lock not acquired, skipping');
      return;
    }

    try {
      const retentionDays =
        parseInt(
          this.configService.get('NOTIFICATION_RETENTION_DAYS', '90'),
          10,
        ) || 90;

      const result =
        await this.notificationsService.deleteOldNotifications(retentionDays);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Notification cleanup completed: ${result.deletedCount} notifications deleted in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Notification cleanup failed: ${error.message}`,
        error.stack,
      );
    } finally {
      await this.lockService.releaseLock('notification-cleanup');
    }
  }
}
