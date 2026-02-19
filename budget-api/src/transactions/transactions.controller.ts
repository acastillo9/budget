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

@ApiTags('Transactions')
@ApiBearerAuth('JWT')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Create a new transaction.
   * @param req The request object.
   * @param createTransactionDto The data to create the transaction.
   * @returns The transaction created.
   * @async
   */
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
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(
      createTransactionDto,
      req.user.userId,
    );
  }

  /**
   * Create a new transfer transaction.
   * @param req The request object.
   * @param createTransferDto The data to create the transfer transaction.
   * @returns The transfer transaction created.
   * @async
   */
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
  @Post('transfer')
  createTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() createTransferDto: CreateTransferDto,
  ) {
    return this.transactionsService.createTransfer(
      createTransferDto,
      req.user.userId,
    );
  }

  /**
   * Find all transactions of an user with pagination.
   * @param req The request object.
   * @param paginationDto The pagination parameters.
   * @returns The transactions found.
   * @async
   */
  @ApiOperation({ summary: 'List transactions with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.transactionsService.findAll(req.user.userId, paginationDto);
  }

  /**
   * Get the summary of transactions for a user.
   * It includes total income, total expenses, and balance.
   * @param req The request object.
   * @return The summary of transactions.
   * @async
   */
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
    return this.transactionsService.getSummary(req.user.userId);
  }

  /**
   * update a transaction by id.
   * @param req The request object.
   * @param id The id of the transaction to update.
   * @param updateTransactionDto The data to update the transaction.
   * @returns The transaction updated.
   * @async
   */
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
    );
  }

  /**
   * Update a transfer transaction by id.
   * @param req The request object.
   * @param id The id of the transfer transaction to update.
   * @param updateTransferDto The data to update the transfer transaction.
   * @returns The transfer transaction updated.
   * @async
   */
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
    );
  }

  /**
   * Remove a transaction by id.
   * @param req The request object.
   * @param id The id of the transaction to remove.
   * @async
   */
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
  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.transactionsService.remove(id, req.user.userId);
  }

  /**
   * Remove a transfer transaction by id.
   * @param req The request object.
   * @param id The id of the transfer transaction to remove.
   * @async
   */
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
  @Delete('transfer/:id')
  removeTransfer(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.transactionsService.removeTransfer(id, req.user.userId);
  }
}
