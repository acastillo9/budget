import { ApiProperty } from '@nestjs/swagger';

export class PaginatedDataDto<T> {
  @ApiProperty({ description: 'Array of results' })
  data: T[];

  @ApiProperty({ description: 'Total number of results', example: 42 })
  total: number;

  @ApiProperty({ description: 'Results per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Number of results skipped', example: 0 })
  offset: number;

  @ApiProperty({
    description: 'Offset for the next page, or null if no more results',
    example: 20,
    nullable: true,
  })
  nextPage: number | null;
}
