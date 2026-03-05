import { Injectable, Logger } from '@nestjs/common';
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

      await this.mailService.sendMail({
        to: user.email,
        subject: event.title,
        template: event.emailTemplate,
        context: {
          ...event.emailContext,
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
