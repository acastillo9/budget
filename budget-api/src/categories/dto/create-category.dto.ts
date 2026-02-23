import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { CategoryType } from '../entities/category-type.enum';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Groceries' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category icon identifier', example: 'cart' })
  @IsNotEmpty()
  @IsString()
  icon: string;

  @ApiProperty({
    description:
      'Category type. Required for top-level categories, inherited from parent for subcategories.',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @ValidateIf((o) => !o.parent)
  @IsEnum(CategoryType)
  categoryType?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (creates a subcategory)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  parent?: string;
}
