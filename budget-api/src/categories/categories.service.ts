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

  async create(
    createCategoryDto: CreateCategoryDto,
    session?: ClientSession,
  ): Promise<CategoryDto> {
    try {
      const data: any = { ...createCategoryDto };

      if (createCategoryDto.parent) {
        const parent = await this.categoryModel.findOne({
          _id: createCategoryDto.parent,
          workspace: (createCategoryDto as any).workspace,
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

  async findAll(workspaceId: string): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel
        .find({ workspace: workspaceId })
        .sort({ createdAt: -1 });
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

  async findTree(workspaceId: string): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel
        .find({ workspace: workspaceId })
        .sort({ createdAt: -1 });

      const allDtos = categories.map((c) =>
        plainToClass(CategoryDto, c.toObject()),
      );

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

  async findByParent(
    parentId: string,
    workspaceId: string,
  ): Promise<CategoryDto[]> {
    try {
      const categories = await this.categoryModel
        .find({ parent: parentId, workspace: workspaceId })
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

  async findCategoryIdsWithChildren(
    categoryIds: string[],
    workspaceId: string,
  ): Promise<string[]> {
    const children = await this.categoryModel.find({
      parent: { $in: categoryIds },
      workspace: workspaceId,
    });
    const childIds = children.map((c) => c.id as string);
    return [...new Set([...categoryIds, ...childIds])];
  }

  async findById(id: string, workspaceId: string): Promise<CategoryDto> {
    try {
      const category = await this.categoryModel.findOne({
        _id: id,
        workspace: workspaceId,
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

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    workspaceId: string,
  ): Promise<CategoryDto> {
    try {
      if (updateCategoryDto.parent) {
        const parent = await this.categoryModel.findOne({
          _id: updateCategoryDto.parent,
          workspace: workspaceId,
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

        const childCount = await this.categoryModel.countDocuments({
          parent: id,
          workspace: workspaceId,
        });
        if (childCount > 0) {
          throw new HttpException(
            'Cannot set parent on a category that has subcategories',
            HttpStatus.BAD_REQUEST,
          );
        }

        updateCategoryDto.categoryType = parent.categoryType;
      }

      if (updateCategoryDto.categoryType && !updateCategoryDto.parent) {
        await this.categoryModel.updateMany(
          { parent: id, workspace: workspaceId },
          { categoryType: updateCategoryDto.categoryType },
        );
      }

      const updatedCategory = await this.categoryModel.findOneAndUpdate(
        { _id: id, workspace: workspaceId },
        updateCategoryDto,
        { new: true },
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

  async remove(id: string, workspaceId: string): Promise<CategoryDto> {
    try {
      const childCount = await this.categoryModel.countDocuments({
        parent: id,
        workspace: workspaceId,
      });
      if (childCount > 0) {
        throw new HttpException(
          'Cannot delete a category that has subcategories. Delete the subcategories first.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const deletedCategory = await this.categoryModel.findOneAndDelete({
        _id: id,
        workspace: workspaceId,
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
