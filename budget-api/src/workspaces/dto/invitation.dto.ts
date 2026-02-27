import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';
import { WorkspaceRole } from '../entities/workspace-role.enum';
import { InvitationStatus } from '../entities/invitation-status.enum';
import { WorkspaceDto } from './workspace.dto';

@Exclude()
export class InvitationDto {
  @Expose()
  @ApiProperty({ description: 'Invitation ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Invited email' })
  email: string;

  @Expose()
  @ApiProperty({ description: 'Assigned role', enum: WorkspaceRole })
  role: WorkspaceRole;

  @Expose()
  @Type(() => WorkspaceDto)
  @ApiProperty({ description: 'Workspace', type: WorkspaceDto })
  workspace: WorkspaceDto;

  @Expose()
  @Type(() => UserDto)
  @ApiProperty({ description: 'Invited by', type: UserDto })
  invitedBy: UserDto;

  @Expose()
  @ApiProperty({ description: 'Expiration date' })
  expiresAt: Date;

  @Expose()
  @ApiProperty({ description: 'Invitation status', enum: InvitationStatus })
  status: InvitationStatus;

  @Expose()
  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;
}
