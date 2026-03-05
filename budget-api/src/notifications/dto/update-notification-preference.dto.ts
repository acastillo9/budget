import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { NotificationType } from '../entities/notification-type.enum';

function IsValidChannelKeys(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidChannelKeys',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'object' || value === null) return false;
          const validKeys = Object.values(NotificationType);
          for (const key of Object.keys(value)) {
            if (!validKeys.includes(key as NotificationType)) return false;
            const channel = (value as Record<string, unknown>)[key];
            if (typeof channel !== 'object' || channel === null) return false;
            const { inApp, email, ...rest } = channel as Record<
              string,
              unknown
            >;
            if (Object.keys(rest).length > 0) return false;
            if (inApp !== undefined && typeof inApp !== 'boolean') return false;
            if (email !== undefined && typeof email !== 'boolean') return false;
          }
          return true;
        },
        defaultMessage() {
          return `channels must have valid NotificationType keys with { inApp?: boolean, email?: boolean } values`;
        },
      },
    });
  };
}

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({
    description: 'Per-event channel toggles',
    example: {
      BILL_OVERDUE: { inApp: true, email: true },
      BUDGET_THRESHOLD: { inApp: true, email: false },
    },
  })
  @IsOptional()
  @IsObject()
  @IsValidChannelKeys()
  channels?: Record<string, { inApp?: boolean; email?: boolean }>;

  @ApiPropertyOptional({
    description: 'Budget alert threshold percentage',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  budgetThresholdPercent?: number;

  @ApiPropertyOptional({
    description: 'Large transaction amount threshold',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  largeTransactionAmount?: number;

  @ApiPropertyOptional({
    description: 'Low balance amount threshold',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowBalanceAmount?: number;

  @ApiPropertyOptional({
    description: 'Days before due date to trigger bill due soon notification',
    example: 3,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  billDueSoonDays?: number;

  @ApiPropertyOptional({
    description: 'Enable quiet hours for email notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (HH:mm format)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (HH:mm format)',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours timezone (IANA timezone)',
    example: 'UTC',
  })
  @IsOptional()
  @IsString()
  quietHoursTimezone?: string;
}
