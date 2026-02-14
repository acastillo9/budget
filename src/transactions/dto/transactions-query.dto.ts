import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class TransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by account ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Filter by month (1-12)', example: 6 })
  @IsString()
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ description: 'Filter by year', example: 2025 })
  @IsString()
  @IsOptional()
  year?: number;
}
