import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryDto } from './dto/category.dto';
import { AuthenticatedRequest } from 'src/shared/types';

@ApiTags('Categories')
@ApiBearerAuth('JWT')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new category.
   * @param req The request object.
   * @param createCategoryDto The data to create the category.
   * @returns The category created.
   * @async
   */
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created',
    type: CategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    const newCategory = {
      ...createCategoryDto,
      user: req.user.userId,
    };
    return this.categoriesService.create(newCategory);
  }

  /**
   * Find all categories as a tree (parents with nested children).
   * @param req The request object.
   * @returns Top-level categories with children populated.
   * @async
   */
  @ApiOperation({
    summary: 'List categories as a tree (parents with nested children)',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree',
    type: [CategoryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('tree')
  findTree(@Request() req: AuthenticatedRequest): Promise<CategoryDto[]> {
    return this.categoriesService.findTree(req.user.userId);
  }

  /**
   * Find all categories of a user.
   * @param req The request object.
   * @returns The categories found.
   * @async
   */
  @ApiOperation({ summary: 'List all categories for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    type: [CategoryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<CategoryDto[]> {
    return this.categoriesService.findAll(req.user.userId);
  }

  /**
   * Find subcategories of a specific parent category.
   * @param req The request object.
   * @param id The id of the parent category.
   * @returns The subcategories found.
   * @async
   */
  @ApiOperation({ summary: 'List subcategories of a parent category' })
  @ApiParam({
    name: 'id',
    description: 'Parent Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'List of subcategories',
    type: [CategoryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':id/subcategories')
  findSubcategories(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto[]> {
    return this.categoriesService.findByParent(id, req.user.userId);
  }

  /**
   * Find a category by id.
   * @param req The request object.
   * @param id The id of the category to find.
   * @returns The category found.
   * @async
   */
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Category found',
    type: CategoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Get(':id')
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.findById(id, req.user.userId);
  }

  /**
   * Update a category by id.
   * @param req The request object.
   * @param id The id of the category to update.
   * @param updateCategoryDto The data to update the category.
   * @returns The category updated.
   * @async
   */
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated',
    type: CategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(
      id,
      updateCategoryDto,
      req.user.userId,
    );
  }

  /**
   * Remove a category by id.
   * @param req The request object.
   * @param id The id of the category to remove.
   * @returns The category removed.
   * @async
   */
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted',
    type: CategoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Delete(':id')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.remove(id, req.user.userId);
  }
}
