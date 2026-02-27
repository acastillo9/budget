import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDto } from './dto/account.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

@ApiTags('Accounts')
@ApiBearerAuth('JWT')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description: 'Account created',
    type: AccountDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.create(
      createAccountDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'List all accounts for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of accounts',
    type: [AccountDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto,
  ): Promise<AccountDto[]> {
    return this.accountsService.findAll(req.user.workspaceId, paginationDto);
  }

  @ApiOperation({ summary: 'Get account balance summary grouped by currency' })
  @ApiResponse({ status: 200, description: 'Account balance summary' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('summary')
  getSummary(@Request() req: AuthenticatedRequest) {
    return this.accountsService.getSummary(req.user.workspaceId);
  }

  @ApiOperation({ summary: 'Update an account' })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Account updated',
    type: AccountDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.update(
      id,
      updateAccountDto,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Delete an account' })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted',
    type: AccountDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AccountDto> {
    return this.accountsService.remove(id, req.user.workspaceId);
  }
}
