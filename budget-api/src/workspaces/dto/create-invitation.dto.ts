import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '../entities/workspace-role.enum';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email to invite', example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign',
    enum: WorkspaceRole,
    example: WorkspaceRole.CONTRIBUTOR,
  })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
