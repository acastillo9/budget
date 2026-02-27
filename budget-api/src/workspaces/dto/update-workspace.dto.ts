import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    description: 'Workspace name',
    example: 'My Household',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
