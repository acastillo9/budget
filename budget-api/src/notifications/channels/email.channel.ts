import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelStrategy } from './channel-strategy.interface';
import { NotificationEvent } from '../services/notification-event.interface';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class EmailChannel implements ChannelStrategy {
  private readonly logger: Logger = new Logger(EmailChannel.name);

  constructor(
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async send(event: NotificationEvent): Promise<void> {
    try {
      if (!event.emailTemplate) {
        this.logger.warn(
          `No email template specified for notification type ${event.type}, skipping email`,
        );
        return;
      }

      const user = await this.usersService.findById(event.userId);
      if (!user || !user.email) {
        this.logger.warn(
          `User ${event.userId} not found or has no email, skipping email notification`,
        );
        return;
      }

      const appUrl = this.configService.get('APP_URL', 'http://localhost:5173');
      const actionLink = event.actionUrl
        ? `${appUrl}${event.actionUrl}`
        : appUrl;

      await this.mailService.sendMail({
        to: user.email,
        subject: event.title,
        template: event.emailTemplate,
        context: {
          ...event.emailContext,
          actionLink,
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
