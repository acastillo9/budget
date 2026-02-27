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
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

@ApiTags('Categories')
@ApiBearerAuth('JWT')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'Category created',
    type: CategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    const newCategory = {
      ...createCategoryDto,
      user: req.user.userId,
      workspace: req.user.workspaceId,
    };
    return this.categoriesService.create(newCategory);
  }

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
    return this.categoriesService.findTree(req.user.workspaceId);
  }

  @ApiOperation({ summary: 'List all categories for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
    type: [CategoryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<CategoryDto[]> {
    return this.categoriesService.findAll(req.user.workspaceId);
  }

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
    return this.categoriesService.findByParent(id, req.user.workspaceId);
  }

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
    return this.categoriesService.findById(id, req.user.workspaceId);
  }

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
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(
      id,
      updateCategoryDto,
      req.user.workspaceId,
    );
  }

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
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete(':id')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.remove(id, req.user.workspaceId);
  }
}
