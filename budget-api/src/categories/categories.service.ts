import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './entities/category.entity';
import { ClientSession, Model } from 'mongoose';
import { CategoryDto } from './dto/category.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CategoriesService {
  private readonly logger: Logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  /**
   * Create a new category.
   * @param createCategoryDto The data to create the category.
   * @param userId The id of the user to create the category.
   * @returns The category created.
   * @async
   */
  async create(
    createCategoryDto: CreateCategoryDto,
    session?: ClientSession,
  ): Promise<CategoryDto> {
    try {
      const data: any = { ...createCategoryDto };

      // If parent is provided, validate and inherit categoryType
      if (createCategoryDto.parent) {
        const parent = await this.categoryModel.findOne({
          _id: createCategoryDto.parent,
          user: (createCategoryDto as any).user,
        });

        if (!parent) {
          throw new HttpException(
            'Parent category not found',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (parent.parent) {
          throw new HttpException(
            'Cannot create subcategory of a subcategory. Only one level of nesting is allowed.',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Inherit categoryType from parent
        data.categoryType = parent.categoryType;
      }

      const categoryModel = new this.categoryModel(data);
      const savedCategory = await categoryModel.save({ session });
      return plainToClass(CategoryDto, savedCategory.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to create category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all categories of a user.
   * @param userId The id of the user to find the categories.
   * @returns The categories found.
   * @async
   */
  async findAll(userId: string): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel.find({ user: userId }).sort({
        createdAt: -1,
      });
      return categories.map((category) =>
        plainToClass(CategoryDto, category.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find categories: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all categories as a tree (parents with nested children).
   * @param userId The id of the user.
   * @returns Top-level categories with children populated.
   * @async
   */
  async findTree(userId: string): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel.find({ user: userId }).sort({
        createdAt: -1,
      });

      const allDtos = categories.map((c) =>
        plainToClass(CategoryDto, c.toObject()),
      );

      // Build a map of parent ID → children
      const childrenMap = new Map<string, CategoryDto[]>();
      const topLevel: CategoryDto[] = [];

      for (const dto of allDtos) {
        if (dto.parent?.id) {
          const parentId = dto.parent.id;
          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }
          childrenMap.get(parentId).push(dto);
        } else {
          topLevel.push(dto);
        }
      }

      // Attach children to parents
      for (const parent of topLevel) {
        parent.children = childrenMap.get(parent.id) || [];
      }

      return topLevel;
    } catch (error) {
      this.logger.error(
        `Failed to find category tree: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the category tree',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find subcategories of a specific parent.
   * @param parentId The id of the parent category.
   * @param userId The id of the user.
   * @returns The subcategories found.
   * @async
   */
  async findByParent(parentId: string, userId: string): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel
        .find({ parent: parentId, user: userId })
        .sort({ createdAt: -1 });
      return categories.map((category) =>
        plainToClass(CategoryDto, category.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find subcategories: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the subcategories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Expand category IDs to include all their subcategory IDs.
   * @param categoryIds The category IDs to expand.
   * @param userId The user ID.
   * @returns Expanded set of category IDs including subcategories.
   * @async
   */
  async findCategoryIdsWithChildren(
    categoryIds: string[],
    userId: string,
  ): Promise<string[]> {
    const children = await this.categoryModel.find({
      parent: { $in: categoryIds },
      user: userId,
    });
    const childIds = children.map((c) => c.id as string);
    // Return deduplicated union
    return [...new Set([...categoryIds, ...childIds])];
  }

  /**
   * Find a category by id.
   * @param id The id of the category to find.
   * @param userId The id of the user to find the category.
   * @returns The category found.
   * @async
   */
  async findById(id: string, userId: string): Promise<CategoryDto> {
    try {
      const category = await this.categoryModel.findOne({
        _id: id,
        user: userId,
      });
      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(CategoryDto, category.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to find category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a category.
   * @param id The id of the category to update.
   * @param updateCategoryDto The data to update the category.
   * @param userId The id of the user to update the category.
   * @returns The category updated.
   * @async
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryDto> {
    try {
      // If setting a parent, validate hierarchy rules
      if (updateCategoryDto.parent) {
        const parent = await this.categoryModel.findOne({
          _id: updateCategoryDto.parent,
          user: userId,
        });

        if (!parent) {
          throw new HttpException(
            'Parent category not found',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (parent.parent) {
          throw new HttpException(
            'Cannot set parent to a subcategory. Only one level of nesting is allowed.',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Prevent setting parent on a category that has children
        const childCount = await this.categoryModel.countDocuments({
          parent: id,
          user: userId,
        });
        if (childCount > 0) {
          throw new HttpException(
            'Cannot set parent on a category that has subcategories',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Inherit categoryType from parent
        updateCategoryDto.categoryType = parent.categoryType;
      }

      // If changing categoryType on a parent, cascade to children
      if (updateCategoryDto.categoryType && !updateCategoryDto.parent) {
        await this.categoryModel.updateMany(
          { parent: id, user: userId },
          { categoryType: updateCategoryDto.categoryType },
        );
      }

      const updatedCategory = await this.categoryModel.findOneAndUpdate(
        { _id: id, user: userId },
        updateCategoryDto,
        {
          new: true,
        },
      );
      if (!updatedCategory) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(CategoryDto, updatedCategory.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove a category.
   * @param id The id of the category to remove.
   * @param userId The id of the user to remove the category.
   * @returns The category removed.
   * @async
   */
  async remove(id: string, userId: string): Promise<CategoryDto> {
    try {
      // Check if category has children
      const childCount = await this.categoryModel.countDocuments({
        parent: id,
        user: userId,
      });
      if (childCount > 0) {
        throw new HttpException(
          'Cannot delete a category that has subcategories. Delete the subcategories first.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const deletedCategory = await this.categoryModel.findOneAndDelete({
        _id: id,
        user: userId,
      });
      if (!deletedCategory) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(CategoryDto, deletedCategory.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove category: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
