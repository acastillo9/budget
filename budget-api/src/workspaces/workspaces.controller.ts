import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { WorkspaceDto } from './dto/workspace.dto';
import { WorkspaceMemberDto } from './dto/workspace-member.dto';
import { InvitationDto } from './dto/invitation.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { Roles } from './decorators/roles.decorator';
import { WorkspaceRole } from './entities/workspace-role.enum';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Workspaces')
@ApiBearerAuth('JWT')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({
    status: 201,
    description: 'Workspace created',
    type: WorkspaceDto,
  })
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(createWorkspaceDto, req.user.userId);
  }

  @ApiOperation({ summary: 'List workspaces for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of workspaces',
    type: [WorkspaceDto],
  })
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.workspacesService.findByUser(req.user.userId);
  }

  @ApiOperation({ summary: 'Get current workspace details' })
  @ApiResponse({
    status: 200,
    description: 'Workspace details',
    type: WorkspaceDto,
  })
  @Get('current')
  findCurrent(@Request() req: AuthenticatedRequest) {
    return this.workspacesService.findById(req.user.workspaceId);
  }

  @ApiOperation({ summary: 'Update workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Workspace updated',
    type: WorkspaceDto,
  })
  @Roles(WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  // --- Members ---

  @ApiOperation({ summary: 'List workspace members' })
  @ApiResponse({
    status: 200,
    description: 'List of members',
    type: [WorkspaceMemberDto],
  })
  @Get('members')
  findMembers(@Request() req: AuthenticatedRequest) {
    return this.workspacesService.findMembers(req.user.workspaceId);
  }

  @ApiOperation({ summary: 'Update a member role' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated',
    type: WorkspaceMemberDto,
  })
  @Roles(WorkspaceRole.OWNER)
  @Patch('members/:memberId/role')
  updateMemberRole(
    @Request() req: AuthenticatedRequest,
    @Param('memberId') memberId: string,
    @Body('role') role: WorkspaceRole,
  ) {
    return this.workspacesService.updateMemberRole(
      req.user.workspaceId,
      memberId,
      role,
    );
  }

  @ApiOperation({ summary: 'Remove a member from workspace' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({
    status: 200,
    description: 'Member removed',
    type: WorkspaceMemberDto,
  })
  @Roles(WorkspaceRole.OWNER)
  @Delete('members/:memberId')
  removeMember(
    @Request() req: AuthenticatedRequest,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(req.user.workspaceId, memberId);
  }

  // --- Invitations ---

  @ApiOperation({ summary: 'Invite a user to workspace' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created',
    type: InvitationDto,
  })
  @Roles(WorkspaceRole.OWNER)
  @Post('invitations')
  createInvitation(
    @Request() req: AuthenticatedRequest,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    return this.workspacesService.createInvitation(
      req.user.workspaceId,
      createInvitationDto,
      req.user.userId,
    );
  }

  @ApiOperation({ summary: 'List workspace invitations' })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
    type: [InvitationDto],
  })
  @Roles(WorkspaceRole.OWNER)
  @Get('invitations')
  findInvitations(@Request() req: AuthenticatedRequest) {
    return this.workspacesService.findInvitationsByWorkspace(
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Validate an invitation token' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
    type: InvitationDto,
  })
  @Public()
  @Get('invitations/:token')
  findInvitationByToken(@Param('token') token: string) {
    return this.workspacesService.findInvitationByToken(token);
  }

  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 201,
    description: 'Invitation accepted',
    type: WorkspaceMemberDto,
  })
  @Post('invitations/:token/accept')
  acceptInvitation(
    @Param('token') token: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workspacesService.acceptInvitation(token, req.user.userId);
  }

  @ApiOperation({ summary: 'Revoke an invitation' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation revoked',
    type: InvitationDto,
  })
  @Roles(WorkspaceRole.OWNER)
  @Delete('invitations/:invitationId')
  revokeInvitation(
    @Request() req: AuthenticatedRequest,
    @Param('invitationId') invitationId: string,
  ) {
    return this.workspacesService.revokeInvitation(
      req.user.workspaceId,
      invitationId,
    );
  }
}
