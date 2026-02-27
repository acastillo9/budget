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
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

@ApiTags('Bills')
@ApiBearerAuth('JWT')
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @ApiOperation({ summary: 'Create a new bill' })
  @ApiResponse({ status: 201, description: 'Bill created', type: BillDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBillDto: CreateBillDto,
  ): Promise<BillDto> {
    return this.billsService.create(
      createBillDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

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
      req.user.workspaceId,
      dateRange.dateStart,
      dateRange.dateEnd,
    );
  }

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
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
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
      req.user.workspaceId,
    );
  }

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
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post(':id/:targetDate/unpay')
  cancelPayment(
    @Param('id') id: string,
    @Param('targetDate', new ParseDatePipe({ optional: false }))
    targetDate: Date,
    @Request() req: AuthenticatedRequest,
  ): Promise<BillInstanceDto> {
    return this.billsService.cancelPayment(
      id,
      targetDate,
      req.user.userId,
      req.user.workspaceId,
    );
  }

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
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
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
      req.user.workspaceId,
    );
  }

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
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
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
      req.user.workspaceId,
    );
  }
}
