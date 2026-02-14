import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateBillDto } from './create-bill.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBillDto extends PartialType(CreateBillDto) {
  @ApiPropertyOptional({
    description: 'Whether changes apply to all future instances',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  applyToFuture?: boolean;
}
