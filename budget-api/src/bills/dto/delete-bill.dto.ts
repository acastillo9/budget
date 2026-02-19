import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteBillDto {
  @ApiPropertyOptional({
    description: 'Whether to delete all future instances',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  applyToFuture?: boolean;
}
