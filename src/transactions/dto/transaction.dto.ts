import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AccountDto } from 'src/accounts/dto/account.dto';
import { CategoryDto } from 'src/categories/dto/category.dto';
import { UserDto } from 'src/users/dto/user.dto';

export class TransactionDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Transaction date',
    example: '2025-06-15T00:00:00.000Z',
  })
  date: Date;

  @ApiProperty({
    description: 'Transaction amount (negative for expenses)',
    example: -75.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Weekly grocery shopping',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Bought items for the week',
  })
  notes: string;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2025-06-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2025-06-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether this is a transfer between accounts',
    example: false,
  })
  isTransfer: boolean;

  @ApiPropertyOptional({
    description: 'Category details',
    type: () => CategoryDto,
  })
  @Type(() => CategoryDto)
  category: CategoryDto;

  @ApiProperty({ description: 'Account details', type: () => AccountDto })
  @Type(() => AccountDto)
  account: AccountDto;

  @ApiPropertyOptional({
    description: 'Linked transfer transaction',
    type: () => TransactionDto,
  })
  @Type(() => TransactionDto)
  transfer: TransactionDto;

  @ApiProperty({ description: 'Owner user', type: () => UserDto })
  @Type(() => UserDto)
  user: UserDto;
}
