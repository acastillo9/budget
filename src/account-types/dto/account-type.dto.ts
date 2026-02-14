import { ApiProperty } from '@nestjs/swagger';
import { AccountCategory } from '../entities/account-category.enum';

export class AccountTypeDto {
  @ApiProperty({
    description: 'Account type ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({ description: 'Account type name', example: 'Checking' })
  name: string;

  @ApiProperty({
    description: 'Account category',
    enum: AccountCategory,
    example: AccountCategory.ASSET,
  })
  accountCategory: AccountCategory;
}
