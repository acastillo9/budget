import { NotificationType } from '../entities/notification-type.enum';

export interface NotificationEvent {
  type: NotificationType;
  userId: string;
  workspaceId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  emailTemplate?: string;
  emailContext?: Record<string, any>;
  deduplicationKey?: string;
}
