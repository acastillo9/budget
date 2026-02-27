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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetDto } from './dto/budget.dto';
import { BudgetProgressDto } from './dto/budget-progress.dto';
import { BudgetProgressQueryDto } from './dto/budget-progress-query.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

@ApiTags('Budgets')
@ApiBearerAuth('JWT')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'Budget created', type: BudgetDto })
  @ApiResponse({
    status: 400,
    description: 'Validation error or category uniqueness conflict',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createBudgetDto: CreateBudgetDto,
  ): Promise<BudgetDto> {
    return this.budgetsService.create(
      createBudgetDto,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'List all budgets for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of budgets',
    type: [BudgetDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<BudgetDto[]> {
    return this.budgetsService.findAll(req.user.workspaceId);
  }

  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'Budget ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Budget found', type: BudgetDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Get(':id')
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BudgetDto> {
    return this.budgetsService.findById(id, req.user.workspaceId);
  }

  @ApiOperation({
    summary: 'Get budget progress',
    description:
      'Returns spent/remaining/percentUsed for each period window. Supports historical queries via from/to query params.',
  })
  @ApiParam({
    name: 'id',
    description: 'Budget ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget progress per period window',
    type: [BudgetProgressDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Get(':id/progress')
  getProgress(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query() query: BudgetProgressQueryDto,
  ): Promise<BudgetProgressDto[]> {
    return this.budgetsService.getProgress(
      id,
      req.user.workspaceId,
      query.from,
      query.to,
    );
  }

  @ApiOperation({ summary: 'Update a budget' })
  @ApiParam({
    name: 'id',
    description: 'Budget ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Budget updated', type: BudgetDto })
  @ApiResponse({
    status: 400,
    description: 'Validation error or category uniqueness conflict',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ): Promise<BudgetDto> {
    return this.budgetsService.update(
      id,
      updateBudgetDto,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Delete a budget' })
  @ApiParam({
    name: 'id',
    description: 'Budget ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Budget deleted', type: BudgetDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete(':id')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BudgetDto> {
    return this.budgetsService.remove(id, req.user.workspaceId);
  }
}
