import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/notification.dto';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { JobName, RunJobParamDto } from './dto/run-job-param.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { PaginatedDataDto } from 'src/shared/dto/paginated-data.dto';
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';
import { BillScannerJob } from './jobs/bill-scanner.job';
import { BudgetCheckerJob } from './jobs/budget-checker.job';
import { LowBalanceJob } from './jobs/low-balance.job';
import { MonthlySummaryJob } from './jobs/monthly-summary.job';
import { NotificationCleanupJob } from './jobs/notification-cleanup.job';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  private readonly jobMap: Record<JobName, { handleCron(): Promise<void> }>;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly billScannerJob: BillScannerJob,
    private readonly budgetCheckerJob: BudgetCheckerJob,
    private readonly lowBalanceJob: LowBalanceJob,
    private readonly monthlySummaryJob: MonthlySummaryJob,
    private readonly notificationCleanupJob: NotificationCleanupJob,
  ) {
    this.jobMap = {
      [JobName.BILL_SCANNER]: this.billScannerJob,
      [JobName.BUDGET_CHECKER]: this.budgetCheckerJob,
      [JobName.LOW_BALANCE]: this.lowBalanceJob,
      [JobName.MONTHLY_SUMMARY]: this.monthlySummaryJob,
      [JobName.NOTIFICATION_CLEANUP]: this.notificationCleanupJob,
    };
  }

  @ApiOperation({ summary: 'Manually trigger a cron notification job' })
  @ApiParam({
    name: 'jobName',
    enum: JobName,
    description: 'Name of the cron job to trigger',
  })
  @ApiResponse({
    status: 200,
    description: 'Job executed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid job name' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires OWNER role' })
  @Roles(WorkspaceRole.OWNER)
  @Post('jobs/:jobName')
  async runJob(
    @Param() params: RunJobParamDto,
  ): Promise<{ job: string; status: string }> {
    await this.jobMap[params.jobName].handleCron();
    return { job: params.jobName, status: 'completed' };
  }

  @ApiOperation({ summary: 'List notifications for current user in workspace' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of notifications',
    type: NotificationDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: NotificationsQueryDto,
  ): Promise<PaginatedDataDto<NotificationDto>> {
    return this.notificationsService.findAll(
      req.user.userId,
      req.user.workspaceId,
      query,
    );
  }

  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('unread-count')
  findUnreadCount(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ count: number }> {
    return this.notificationsService.findUnreadCount(
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences (auto-creates defaults if none)',
    type: NotificationPreferenceDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('preferences')
  getPreferences(
    @Request() req: AuthenticatedRequest,
  ): Promise<NotificationPreferenceDto> {
    return this.notificationsService.getPreferences(
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Updated notification preferences',
    type: NotificationPreferenceDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Put('preferences')
  updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceDto> {
    return this.notificationsService.updatePreferences(
      req.user.userId,
      req.user.workspaceId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Count of modified notifications',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('read-all')
  markAllAsRead(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ modifiedCount: number }> {
    return this.notificationsService.markAllAsRead(
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<NotificationDto> {
    return this.notificationsService.markAsRead(
      id,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted',
    type: NotificationDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<NotificationDto> {
    return this.notificationsService.remove(
      id,
      req.user.userId,
      req.user.workspaceId,
    );
  }
}
