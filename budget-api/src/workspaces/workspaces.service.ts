import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Invitation } from './entities/invitation.entity';
import { WorkspaceRole } from './entities/workspace-role.enum';
import { InvitationStatus } from './entities/invitation-status.enum';
import { WorkspaceDto } from './dto/workspace.dto';
import { WorkspaceMemberDto } from './dto/workspace-member.dto';
import { InvitationDto } from './dto/invitation.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { plainToClass } from 'class-transformer';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class WorkspacesService {
  private readonly logger: Logger = new Logger(WorkspacesService.name);

  constructor(
    @InjectModel(Workspace.name)
    private readonly workspaceModel: Model<Workspace>,
    @InjectModel(WorkspaceMember.name)
    private readonly workspaceMemberModel: Model<WorkspaceMember>,
    @InjectModel(Invitation.name)
    private readonly invitationModel: Model<Invitation>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly i18n: I18nService,
  ) {}

  async createDefaultWorkspace(
    userId: string,
    name: string,
    session?: ClientSession,
  ): Promise<WorkspaceDto> {
    const workspace = new this.workspaceModel({
      name,
      owner: userId,
    });
    const savedWorkspace = await workspace.save({ session });

    const member = new this.workspaceMemberModel({
      workspace: savedWorkspace.id,
      user: userId,
      role: WorkspaceRole.OWNER,
    });
    await member.save({ session });

    return plainToClass(WorkspaceDto, savedWorkspace.toObject());
  }

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: string,
    session?: ClientSession,
  ): Promise<WorkspaceDto> {
    try {
      const workspace = new this.workspaceModel({
        ...createWorkspaceDto,
        owner: userId,
      });
      const savedWorkspace = await workspace.save({ session });

      const member = new this.workspaceMemberModel({
        workspace: savedWorkspace.id,
        user: userId,
        role: WorkspaceRole.OWNER,
      });
      await member.save({ session });

      return plainToClass(WorkspaceDto, savedWorkspace.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to create workspace: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the workspace',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByUser(userId: string): Promise<WorkspaceDto[]> {
    try {
      const memberships = await this.workspaceMemberModel.find({
        user: userId,
      });
      const workspaceIds = memberships.map((m) => m.workspace);
      const workspaces = await this.workspaceModel.find({
        _id: { $in: workspaceIds },
      });
      return workspaces.map((w) => plainToClass(WorkspaceDto, w.toObject()));
    } catch (error) {
      this.logger.error(
        `Failed to find workspaces for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding workspaces',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(workspaceId: string): Promise<WorkspaceDto> {
    try {
      const workspace = await this.workspaceModel.findById(workspaceId);
      if (!workspace) {
        throw new HttpException('Workspace not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(WorkspaceDto, workspace.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to find workspace ${workspaceId}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the workspace',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    workspaceId: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDto> {
    try {
      const workspace = await this.workspaceModel.findByIdAndUpdate(
        workspaceId,
        updateWorkspaceDto,
        { new: true },
      );
      if (!workspace) {
        throw new HttpException('Workspace not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(WorkspaceDto, workspace.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update workspace: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the workspace',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberDto | null> {
    try {
      const member = await this.workspaceMemberModel.findOne({
        workspace: workspaceId,
        user: userId,
      });
      if (!member) return null;
      return plainToClass(WorkspaceMemberDto, member.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find membership: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding membership',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    try {
      const members = await this.workspaceMemberModel.find({
        workspace: workspaceId,
      });
      return members.map((m) => plainToClass(WorkspaceMemberDto, m.toObject()));
    } catch (error) {
      this.logger.error(
        `Failed to find members: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding workspace members',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberDto> {
    try {
      const member = await this.workspaceMemberModel.findOneAndUpdate(
        { _id: memberId, workspace: workspaceId },
        { role },
        { new: true },
      );
      if (!member) {
        throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(WorkspaceMemberDto, member.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update member role: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating member role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
  ): Promise<WorkspaceMemberDto> {
    try {
      const member = await this.workspaceMemberModel.findOne({
        _id: memberId,
        workspace: workspaceId,
      });
      if (!member) {
        throw new HttpException('Member not found', HttpStatus.NOT_FOUND);
      }
      if (member.role === WorkspaceRole.OWNER) {
        throw new HttpException(
          'Cannot remove the workspace owner',
          HttpStatus.BAD_REQUEST,
        );
      }
      const deleted =
        await this.workspaceMemberModel.findByIdAndDelete(memberId);
      return plainToClass(WorkspaceMemberDto, deleted.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove member: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing member',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    session?: ClientSession,
  ): Promise<WorkspaceMemberDto> {
    try {
      const member = new this.workspaceMemberModel({
        workspace: workspaceId,
        user: userId,
        role,
      });
      const savedMember = await member.save({ session });
      return plainToClass(WorkspaceMemberDto, savedMember.toObject());
    } catch (error) {
      this.logger.error(`Failed to add member: ${error.message}`, error.stack);
      throw new HttpException(
        'Error adding member to workspace',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- Invitation methods ---

  async createInvitation(
    workspaceId: string,
    createInvitationDto: CreateInvitationDto,
    invitedByUserId: string,
  ): Promise<InvitationDto> {
    // Check if already a member
    const existingUser = await this.usersService.findByEmail(
      createInvitationDto.email,
    );
    if (existingUser) {
      const existingMembership = await this.workspaceMemberModel.findOne({
        workspace: workspaceId,
        user: existingUser.id,
      });
      if (existingMembership) {
        throw new HttpException(
          'User is already a member of this workspace',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Revoke any existing pending invitation for this email+workspace
    await this.invitationModel.updateMany(
      {
        workspace: workspaceId,
        email: createInvitationDto.email,
        status: InvitationStatus.PENDING,
      },
      { status: InvitationStatus.REVOKED },
    );

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      const invitation = new this.invitationModel({
        email: createInvitationDto.email,
        role: createInvitationDto.role,
        workspace: workspaceId,
        invitedBy: invitedByUserId,
        token,
        expiresAt,
        status: InvitationStatus.PENDING,
      });
      const savedInvitation = await invitation.save();

      // Send invitation email
      const appUrl = this.configService.get('APP_URL', 'http://localhost:5173');
      const inviteLink = `${appUrl}/accept-invite/${token}`;
      const workspace = await this.workspaceModel.findById(workspaceId);

      this.mailService.sendMail({
        to: createInvitationDto.email,
        subject: this.i18n.t('workspaceInvitation.subject'),
        template: 'workspaceInvitation',
        context: {
          workspaceName: workspace?.name || 'Workspace',
          inviteLink,
          year: new Date().getFullYear(),
        },
      });

      return plainToClass(InvitationDto, savedInvitation.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to create invitation: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating invitation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findInvitationsByWorkspace(
    workspaceId: string,
  ): Promise<InvitationDto[]> {
    try {
      const invitations = await this.invitationModel
        .find({ workspace: workspaceId })
        .sort({ createdAt: -1 });
      return invitations.map((i) => plainToClass(InvitationDto, i.toObject()));
    } catch (error) {
      this.logger.error(
        `Failed to find invitations: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding invitations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findInvitationByToken(token: string): Promise<InvitationDto> {
    try {
      const invitation = await this.invitationModel.findOne({ token });
      if (!invitation) {
        throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND);
      }
      if (invitation.status !== InvitationStatus.PENDING) {
        throw new HttpException(
          `Invitation is ${invitation.status.toLowerCase()}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (invitation.expiresAt < new Date()) {
        invitation.status = InvitationStatus.EXPIRED;
        await invitation.save();
        throw new HttpException(
          'Invitation has expired',
          HttpStatus.BAD_REQUEST,
        );
      }
      return plainToClass(InvitationDto, invitation.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to find invitation: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding invitation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<WorkspaceMemberDto> {
    const invitation = await this.invitationModel.findOne({ token });
    if (!invitation) {
      throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND);
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new HttpException(
        `Invitation is ${invitation.status.toLowerCase()}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();
      throw new HttpException('Invitation has expired', HttpStatus.BAD_REQUEST);
    }

    // Check if already a member
    const existingMembership = await this.workspaceMemberModel.findOne({
      workspace: invitation.workspace,
      user: userId,
    });
    if (existingMembership) {
      invitation.status = InvitationStatus.ACCEPTED;
      await invitation.save();
      return plainToClass(WorkspaceMemberDto, existingMembership.toObject());
    }

    try {
      const workspaceRef = invitation.workspace as any;
      const workspaceId =
        typeof workspaceRef === 'object' && workspaceRef._id
          ? workspaceRef._id.toString()
          : String(workspaceRef);
      const member = await this.addMember(workspaceId, userId, invitation.role);
      invitation.status = InvitationStatus.ACCEPTED;
      await invitation.save();
      return member;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to accept invitation: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error accepting invitation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async revokeInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<InvitationDto> {
    try {
      const invitation = await this.invitationModel.findOneAndUpdate(
        {
          _id: invitationId,
          workspace: workspaceId,
          status: InvitationStatus.PENDING,
        },
        { status: InvitationStatus.REVOKED },
        { new: true },
      );
      if (!invitation) {
        throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(InvitationDto, invitation.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to revoke invitation: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error revoking invitation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
