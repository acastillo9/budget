import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class NotificationPreferenceDto {
  @Expose()
  @ApiProperty({
    description: 'Notification preference ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Per-event channel toggles',
    example: {
      BILL_OVERDUE: { inApp: true, email: true },
      BUDGET_THRESHOLD: { inApp: true, email: false },
    },
  })
  channels: Record<string, { inApp: boolean; email: boolean }>;

  @Expose()
  @ApiProperty({
    description: 'Budget alert threshold percentage',
    example: 80,
  })
  budgetThresholdPercent: number;

  @Expose()
  @ApiProperty({
    description: 'Large transaction amount threshold',
    example: 500,
  })
  largeTransactionAmount: number;

  @Expose()
  @ApiProperty({
    description: 'Low balance amount threshold',
    example: 100,
  })
  lowBalanceAmount: number;

  @Expose()
  @ApiProperty({
    description: 'Days before due date for bill due soon notification',
    example: 3,
  })
  billDueSoonDays: number;

  @Expose()
  @ApiProperty({
    description: 'Whether quiet hours are enabled',
    example: false,
  })
  quietHoursEnabled: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quiet hours start time (HH:mm)',
    example: '22:00',
  })
  quietHoursStart: string;

  @Expose()
  @ApiProperty({
    description: 'Quiet hours end time (HH:mm)',
    example: '08:00',
  })
  quietHoursEnd: string;

  @Expose()
  @ApiProperty({
    description: 'Quiet hours timezone (IANA)',
    example: 'UTC',
  })
  quietHoursTimezone: string;
}
