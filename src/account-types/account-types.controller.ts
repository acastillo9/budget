import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountTypeDto } from './dto/account-type.dto';
import { AccountTypesService } from './account-types.service';

@ApiTags('Account Types')
@ApiBearerAuth('JWT')
@Controller('account-types')
export class AccountTypesController {
  constructor(private readonly accountTypesService: AccountTypesService) {}

  /**
   * Find all account types.
   * @return {Promise<AccountTypeDto[]>} The account types found.
   * @async
   */
  @ApiOperation({ summary: 'List all account types' })
  @ApiResponse({
    status: 200,
    description: 'List of account types',
    type: [AccountTypeDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT token',
  })
  @Get()
  findAll(): Promise<AccountTypeDto[]> {
    return this.accountTypesService.findAll();
  }
}
