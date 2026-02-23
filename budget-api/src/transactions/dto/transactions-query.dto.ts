import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsOptional } from 'class-validator';

export class TransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering transactions (inclusive)',
    example: '2026-01-01',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({
    description: 'End date for filtering transactions (exclusive)',
    example: '2026-02-01',
  })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;

  @ApiPropertyOptional({
    description: 'Filter by category ID (includes subcategories automatically)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsOptional()
  categoryId?: string;
}
