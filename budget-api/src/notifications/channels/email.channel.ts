import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
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
    private readonly i18n: I18nService,
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

      const lang = (user as any).language || 'en';

      const subject = this.i18n.t(`${event.emailTemplate}.subject`, {
        lang,
        args: event.emailContext || {},
      });

      const appUrl = this.configService.get('APP_URL', 'http://localhost:5173');
      const actionLink = event.actionUrl
        ? `${appUrl}${event.actionUrl}`
        : appUrl;

      await this.mailService.sendMail({
        to: user.email,
        subject,
        template: event.emailTemplate,
        context: {
          ...event.emailContext,
          i18nLang: lang,
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
