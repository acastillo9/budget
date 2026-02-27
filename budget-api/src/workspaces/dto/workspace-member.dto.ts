import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';
import { WorkspaceRole } from '../entities/workspace-role.enum';

@Exclude()
export class WorkspaceMemberDto {
  @Expose()
  @ApiProperty({ description: 'Membership ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Workspace ID' })
  workspace: string;

  @Expose()
  @Type(() => UserDto)
  @ApiProperty({ description: 'Member user', type: UserDto })
  user: UserDto;

  @Expose()
  @ApiProperty({ description: 'Member role', enum: WorkspaceRole })
  role: WorkspaceRole;

  @Expose()
  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;
}
