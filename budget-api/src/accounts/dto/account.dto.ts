import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';
import { UserDto } from 'src/users/dto/user.dto';
import { AccountTypeDto } from '../../account-types/dto/account-type.dto';

export class AccountDto {
  @ApiProperty({
    description: 'Account ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({ description: 'Account name', example: 'Main Checking' })
  name: string;

  @ApiProperty({ description: 'Current balance', example: 2450.75 })
  balance: number;

  @ApiProperty({
    description: 'Currency code',
    enum: CurrencyCode,
    example: CurrencyCode.USD,
  })
  currencyCode: CurrencyCode;

  @ApiProperty({
    description: 'Account type details',
    type: () => AccountTypeDto,
  })
  @Type(() => AccountTypeDto)
  accountType: AccountTypeDto;

  @ApiProperty({ description: 'Owner user', type: () => UserDto })
  @Type(() => UserDto)
  user: UserDto;
}
