import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { NotificationType } from '../entities/notification-type.enum';

@Exclude()
export class NotificationDto {
  @Expose()
  @ApiProperty({
    description: 'Notification ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.BILL_OVERDUE,
  })
  type: NotificationType;

  @Expose()
  @ApiProperty({
    description: 'Notification title',
    example: 'Bill Overdue',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'Notification message body',
    example: 'Your electricity bill is overdue',
  })
  message: string;

  @Expose()
  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  isRead: boolean;

  @Expose()
  @ApiPropertyOptional({
    description: 'Timestamp when the notification was marked as read',
    example: '2026-03-05T10:30:00.000Z',
  })
  readAt?: Date;

  @Expose()
  @ApiPropertyOptional({
    description: 'Event-specific payload data',
    example: { billId: '507f1f77bcf86cd799439011' },
  })
  data?: Record<string, any>;

  @Expose()
  @ApiPropertyOptional({
    description: 'Deep link path for navigation',
    example: '/bills',
  })
  actionUrl?: string;

  @Expose()
  @ApiProperty({
    description: 'Notification creation timestamp',
    example: '2026-03-05T10:30:00.000Z',
  })
  createdAt: Date;
}
