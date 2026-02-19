import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class BudgetProgressQueryDto {
  @ApiPropertyOptional({
    description: 'Start of date range for historical progress',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @ApiPropertyOptional({
    description: 'End of date range for historical progress',
    example: '2025-06-30T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;
}
