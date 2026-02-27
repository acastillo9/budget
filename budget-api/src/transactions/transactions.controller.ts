import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionDto } from './dto/transaction.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

@ApiTags('Transactions')
@ApiBearerAuth('JWT')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({
    summary: 'Create a new transaction',
    description: 'Amount is automatically negated for expense categories.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created',
    type: TransactionDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(
      createTransactionDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({
    summary: 'Create a transfer between two accounts',
    description:
      'Creates two linked transactions — a debit from the origin account and a credit to the destination account.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer created',
    type: TransactionDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post('transfer')
  createTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.transactionsService.createTransfer(
      createTransferDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'List transactions with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto,
    @Query() queryDto: TransactionsQueryDto,
  ) {
    return this.transactionsService.findAll(
      req.user.workspaceId,
      paginationDto,
      queryDto.categoryId,
      queryDto.dateFrom,
      queryDto.dateTo,
    );
  }

  @ApiOperation({
    summary: 'Get monthly income/expense summary grouped by currency',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction summary for the current month',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('summary')
  getSummary(@Request() req: AuthenticatedRequest) {
    return this.transactionsService.getSummary(req.user.workspaceId);
  }

  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated',
    type: TransactionDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(
      id,
      updateTransactionDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({
    summary: 'Update a transfer transaction',
    description: 'Updates both sides of the transfer atomically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transfer transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer updated',
    type: TransactionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or not a transfer',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Patch('transfer/:id')
  updateTransfer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
  ) {
    return this.transactionsService.updateTransfer(
      id,
      updateTransferDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction deleted',
    type: TransactionDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transactionsService.remove(
      id,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({
    summary: 'Delete a transfer transaction',
    description:
      'Removes both linked transactions and reverts account balances.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transfer transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer deleted',
    type: TransactionDto,
  })
  @ApiResponse({ status: 400, description: 'Transaction is not a transfer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete('transfer/:id')
  removeTransfer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.transactionsService.removeTransfer(
      id,
      req.user.userId,
      req.user.workspaceId,
    );
  }
}
