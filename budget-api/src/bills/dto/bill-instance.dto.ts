import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountDto } from 'src/accounts/dto/account.dto';
import { BillFrequency } from '../entities/bill-frequency.enum';
import { BillStatus } from '../entities/bill-status.enum';
import { Type } from 'class-transformer';
import { CategoryDto } from 'src/categories/dto/category.dto';

export class BillInstanceDto {
  @ApiProperty({ description: 'Bill ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({
    description: 'Target date for this instance (ISO date)',
    example: '2025-07-01',
  })
  targetDate: string;

  @ApiProperty({ description: 'Bill name', example: 'Netflix Subscription' })
  name: string;

  @ApiProperty({ description: 'Bill amount', example: 15.99 })
  amount: number;

  @ApiProperty({
    description: 'Due date for this instance',
    example: '2025-07-01',
  })
  dueDate: string;

  @ApiPropertyOptional({
    description: 'End date for recurring bill',
    example: '2025-12-31',
  })
  endDate?: string;

  @ApiProperty({
    description: 'Bill instance status',
    enum: BillStatus,
    example: BillStatus.UPCOMING,
  })
  status: BillStatus;

  @ApiProperty({
    description: 'Bill recurrence frequency',
    enum: BillFrequency,
    example: BillFrequency.MONTHLY,
  })
  frequency: BillFrequency;

  @ApiPropertyOptional({
    description: 'Date the bill was paid',
    example: '2025-07-01',
  })
  paidDate?: string;

  @ApiPropertyOptional({
    description: 'ID of the linked payment transaction',
    example: '507f1f77bcf86cd799439012',
  })
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Whether changes apply to all future instances',
    example: false,
  })
  applyToFuture?: boolean;

  @ApiProperty({ description: 'Payment account', type: () => AccountDto })
  @Type(() => AccountDto)
  account: AccountDto;

  @ApiProperty({ description: 'Bill category', type: () => CategoryDto })
  @Type(() => CategoryDto)
  category: CategoryDto;
}
