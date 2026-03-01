import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';

@Exclude()
export class WorkspaceDto {
  @Expose()
  @ApiProperty({ description: 'Workspace ID' })
  id: string;

  @Expose()
  @Type(() => UserDto)
  @ApiProperty({ description: 'Workspace owner', type: UserDto })
  owner: UserDto;

  @Expose()
  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}
