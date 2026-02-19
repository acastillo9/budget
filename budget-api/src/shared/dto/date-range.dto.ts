import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class DateRangeDto {
  @ApiProperty({
    description: 'Range start date',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  dateStart: Date;

  @ApiProperty({
    description: 'Range end date',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  dateEnd: Date;
}
