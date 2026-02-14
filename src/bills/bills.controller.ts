import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  ParseDatePipe,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BillsService } from './bills.service';
import { BillDto } from './dto/bill.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { CreateBillDto } from './dto/create-bill.dto';
import { DateRangeDto } from 'src/shared/dto/date-range.dto';
import { BillInstanceDto } from './dto/bill-instance.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { PayBillDto } from './dto/pay-bill.dto';
import { DeleteBillDto } from './dto/delete-bill.dto';

@ApiTags('Bills')
@ApiBearerAuth('JWT')
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  /**
   * Create a new bill.
   * @param req The request object.
   * @param createBillDto The data to create the bill.
   * @returns The bill created.
   * @async
   */
  @ApiOperation({ summary: 'Create a new bill' })
  @ApiResponse({ status: 201, description: 'Bill created', type: BillDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBillDto: CreateBillDto,
  ): Promise<BillDto> {
    return this.billsService.create(createBillDto, req.user.userId);
  }

  /**
   * Fetch all bills.
   * @returns An array of bills.
   * @async
   */
  @ApiOperation({
    summary: 'List bill instances within a date range',
    description:
      'Returns virtual bill instances generated from recurring bill definitions within the specified date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bill instances',
    type: [BillInstanceDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error — missing date range',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() dateRange: DateRangeDto,
  ): Promise<BillInstanceDto[]> {
    return this.billsService.findAll(
      req.user.userId,
      dateRange.dateStart,
      dateRange.dateEnd,
    );
  }

  /**
   * Pay a bill.
   * @param id The id of the bill to pay.
   * @param targetDate The date of the bill to pay.
   * @param req The request object.
   * @param payBillDto The data to pay the bill.
   * @returns The bill paid.
   * @async
   */
  @ApiOperation({
    summary: 'Pay a bill instance',
    description:
      'Creates a linked transaction and marks the bill instance as paid.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'targetDate',
    description: 'Bill instance target date (YYYY-MM-DD)',
    example: '2025-07-01',
  })
  @ApiResponse({ status: 201, description: 'Bill paid', type: BillInstanceDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @Post(':id/:targetDate/pay')
  payBill(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
    @Body() payBillDto: PayBillDto,
  ): Promise<BillInstanceDto> {
    return this.billsService.payBill(
      id,
      targetDate,
      payBillDto,
      req.user.userId,
    );
  }

  /**
   * Cancel a payment for a bill.
   * @param id The id of the bill to cancel the payment.
   * @param targetDate The date of the bill instance to cancel the payment.
   * @param req The request object.
   * @return The bill instance with the payment canceled.
   * @async
   */
  @ApiOperation({
    summary: 'Cancel a bill payment',
    description:
      'Removes the linked transaction and marks the bill instance as unpaid.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'targetDate',
    description: 'Bill instance target date (YYYY-MM-DD)',
    example: '2025-07-01',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment cancelled',
    type: BillInstanceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @Post(':id/:targetDate/unpay')
  cancelPayment(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
  ): Promise<BillInstanceDto> {
    return this.billsService.cancelPayment(id, targetDate, req.user.userId);
  }

  /**
   * Update a bill.
   * @param id The id of the bill to update.
   * @param targetDate The date of the bill instance to update.
   * @param req The request object.
   * @param updateBillDto The data to update the bill.
   * @returns The bill updated.
   * @async
   */
  @ApiOperation({
    summary: 'Update a bill instance',
    description:
      'Updates a specific bill instance. Use applyToFuture to propagate changes to subsequent instances.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'targetDate',
    description: 'Bill instance target date (YYYY-MM-DD)',
    example: '2025-07-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Bill instance updated',
    type: BillInstanceDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @Patch(':id/:targetDate')
  update(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
    @Body() updateBillDto: UpdateBillDto,
  ): Promise<BillInstanceDto> {
    return this.billsService.update(
      id,
      targetDate,
      updateBillDto,
      req.user.userId,
    );
  }

  /**
   * Delete a bill.
   * @param id The id of the bill to delete.
   * @param targetDate The date of the bill to delete.
   * @param req The request object.
   * @returns A promise that resolves when the bill is deleted.
   * @async
   */
  @ApiOperation({
    summary: 'Delete a bill instance',
    description:
      'Marks a bill instance as deleted. Use applyToFuture to delete all subsequent instances.',
  })
  @ApiParam({
    name: 'id',
    description: 'Bill ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'targetDate',
    description: 'Bill instance target date (YYYY-MM-DD)',
    example: '2025-07-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Bill instance deleted',
    type: BillInstanceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  @Delete(':id/:targetDate')
  delete(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
    @Body() deleteBillDto: DeleteBillDto,
  ): Promise<BillInstanceDto> {
    return this.billsService.delete(
      id,

      targetDate,
      deleteBillDto,
      req.user.userId,
    );
  }
}
