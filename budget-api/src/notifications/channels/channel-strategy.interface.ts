import { NotificationEvent } from '../services/notification-event.interface';

export interface ChannelStrategy {
  send(event: NotificationEvent): Promise<void>;
}
