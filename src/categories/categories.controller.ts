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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryDto } from './dto/category.dto';
import { AuthenticatedRequest } from 'src/shared/types';

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
   * Find all categories of a user.
   * @param req The request object.
   * @returns The categories found.
   * @async
   */
  @Get()
  findAll(@Request() req: AuthenticatedRequest): Promise<CategoryDto[]> {
    return this.categoriesService.findAll(req.user.userId);
  }

  /**
   * Find a category by id.
   * @param req The request object.
   * @param id The id of the category to find.
   * @returns The category found.
   * @async
   */
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
  @Delete(':id')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.remove(id, req.user.userId);
  }
}
