import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class PayBillDto {
  @ApiProperty({
    description: 'Date the bill was paid',
    example: '2025-07-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  paidDate: Date;
}
