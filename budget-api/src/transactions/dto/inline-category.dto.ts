import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CategoryType } from 'src/categories/entities/category-type.enum';

export class InlineCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Groceries' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category icon identifier', example: 'cart' })
  @IsNotEmpty()
  @IsString()
  icon: string;

  @ApiProperty({
    description: 'Category type',
    enum: CategoryType,
    example: CategoryType.EXPENSE,
  })
  @IsEnum(CategoryType)
  categoryType: string;
}
