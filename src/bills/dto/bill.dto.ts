import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountDto } from 'src/accounts/dto/account.dto';
import { BillFrequency } from '../entities/bill-frequency.enum';
import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';
import { CategoryDto } from 'src/categories/dto/category.dto';

export class BillDto {
  @ApiProperty({ description: 'Bill ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'Bill name', example: 'Netflix Subscription' })
  name: string;

  @ApiProperty({ description: 'Bill amount', example: 15.99 })
  amount: number;

  @ApiProperty({
    description: 'Bill due date',
    example: '2025-07-01T00:00:00.000Z',
  })
  dueDate: Date;

  @ApiPropertyOptional({
    description: 'End date for recurring bill',
    example: '2025-12-31T00:00:00.000Z',
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Bill recurrence frequency',
    enum: BillFrequency,
    example: BillFrequency.MONTHLY,
  })
  frequency: BillFrequency;

  @ApiProperty({ description: 'Payment account', type: () => AccountDto })
  @Type(() => AccountDto)
  account: AccountDto;

  @ApiProperty({ description: 'Bill category', type: () => CategoryDto })
  @Type(() => CategoryDto)
  category: CategoryDto;

  @ApiProperty({ description: 'Owner user', type: () => UserDto })
  @Type(() => UserDto)
  user: UserDto;
}
