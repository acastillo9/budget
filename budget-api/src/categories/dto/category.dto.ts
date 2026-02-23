import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserDto } from 'src/users/dto/user.dto';

export class ParentCategoryDto {
  @ApiProperty({
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({ description: 'Category name', example: 'Food & Dining' })
  name: string;

  @ApiProperty({ description: 'Category icon identifier', example: 'utensils' })
  icon: string;

  @ApiProperty({
    description: 'Category type',
    enum: ['EXPENSE', 'INCOME'],
    example: 'EXPENSE',
  })
  categoryType: string;
}

export class CategoryDto {
  @ApiProperty({
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({ description: 'Category name', example: 'Groceries' })
  name: string;

  @ApiProperty({ description: 'Category icon identifier', example: 'cart' })
  icon: string;

  @ApiProperty({
    description: 'Category type',
    enum: ['EXPENSE', 'INCOME'],
    example: 'EXPENSE',
  })
  categoryType: string;

  @ApiPropertyOptional({
    description: 'Parent category (null for top-level)',
    type: () => ParentCategoryDto,
  })
  @Type(() => ParentCategoryDto)
  parent?: ParentCategoryDto;

  @ApiPropertyOptional({
    description: 'Child categories (populated in tree endpoint)',
    type: () => [CategoryDto],
  })
  @Type(() => CategoryDto)
  children?: CategoryDto[];

  @ApiProperty({ description: 'Owner user', type: () => UserDto })
  @Type(() => UserDto)
  user: UserDto;
}
