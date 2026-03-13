import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum JobName {
  BILL_SCANNER = 'bill-scanner',
  BUDGET_CHECKER = 'budget-checker',
  LOW_BALANCE = 'low-balance',
  MONTHLY_SUMMARY = 'monthly-summary',
  NOTIFICATION_CLEANUP = 'notification-cleanup',
}

export class RunJobParamDto {
  @ApiProperty({
    enum: JobName,
    description: 'Name of the cron job to trigger',
    example: JobName.BILL_SCANNER,
  })
  @IsEnum(JobName)
  jobName: JobName;
}
