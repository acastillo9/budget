---
name: budget-api
description: >
  Contextualized patterns for the budget-api NestJS backend (budget-api/).
  Use when creating, editing, or reviewing any code inside budget-api/ including
  controllers, services, modules, guards, DTOs, schemas, entities, interceptors,
  pipes, migrations, or E2E tests. Triggers on work in budget-api/ such as adding
  endpoints, creating features, fixing bugs, writing tests, or modifying backend logic.
---

# Budget API Patterns

Root: `budget-api/`. NestJS + TypeScript + MongoDB (Mongoose).

Read `budget-api/CLAUDE.md` for architecture details, commands, and domain-specific logic (bills, budgets, transactions, workspaces).

## Controller Pattern

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';
import { AuthenticatedRequest } from 'src/shared/types';

@ApiTags('Features')
@ApiBearerAuth('JWT')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created', type: FeatureDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createFeatureDto: CreateFeatureDto,
  ): Promise<FeatureDto> {
    return this.featuresService.create(createFeatureDto, req.user.userId, req.user.workspaceId);
  }

  @ApiOperation({ summary: 'List all features' })
  @ApiResponse({ status: 200, description: 'List of features', type: [FeatureDto] })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto,
  ): Promise<FeatureDto[]> {
    return this.featuresService.findAll(req.user.workspaceId, paginationDto);
  }

  @ApiOperation({ summary: 'Update a feature' })
  @ApiParam({ name: 'id', description: 'Feature ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Feature updated', type: FeatureDto })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateFeatureDto: UpdateFeatureDto,
  ): Promise<FeatureDto> {
    return this.featuresService.update(id, updateFeatureDto, req.user.workspaceId);
  }

  @ApiOperation({ summary: 'Delete a feature' })
  @ApiParam({ name: 'id', description: 'Feature ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Feature deleted', type: FeatureDto })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest): Promise<FeatureDto> {
    return this.featuresService.remove(id, req.user.workspaceId);
  }
}
```

Rules:
- Every controller: `@ApiTags` + `@ApiBearerAuth('JWT')` + `@Controller('route')`
- Every endpoint: `@ApiOperation` + `@ApiResponse` (include 201/200, 400, 401, 404 as applicable)
- Path params: `@ApiParam` with `name`, `description`, `example`
- Mutating endpoints: `@Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)`
- Access session via `@Request() req: AuthenticatedRequest` → `req.user.userId`, `req.user.workspaceId`
- Controllers delegate to service — no business logic in controllers
- Return `Promise<Dto>` or `Promise<Dto[]>`

## Service Pattern

```typescript
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { DbTransactionService } from 'src/shared/db-transaction.service';

@Injectable()
export class FeaturesService {
  private readonly logger: Logger = new Logger(FeaturesService.name);

  constructor(
    @InjectModel(Feature.name) private readonly featureModel: Model<Feature>,
    private readonly dbTransactionService: DbTransactionService,
  ) {}

  async create(dto: CreateFeatureDto, userId: string, workspaceId: string): Promise<FeatureDto> {
    try {
      const model = new this.featureModel({ ...dto, user: userId, workspace: workspaceId });
      const saved = await model.save();
      return plainToClass(FeatureDto, saved.toObject());
    } catch (error) {
      this.logger.error(`Failed to create feature: ${error.message}`, error.stack);
      throw new HttpException('Error creating the feature', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(workspaceId: string, paginationDto: PaginationDto): Promise<FeatureDto[]> {
    try {
      const items = await this.featureModel.find(
        { workspace: workspaceId },
        null,
        { limit: paginationDto.limit, sort: { createdAt: -1 } },
      );
      return items.map((item) => plainToClass(FeatureDto, item.toObject()));
    } catch (error) {
      this.logger.error(`Failed to find features: ${error.message}`, error.stack);
      throw new HttpException('Error finding the features', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findById(id: string, workspaceId: string): Promise<FeatureDto> {
    try {
      const item = await this.featureModel.findOne({ _id: id, workspace: workspaceId });
      if (!item) throw new HttpException('Feature not found', HttpStatus.NOT_FOUND);
      return plainToClass(FeatureDto, item.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to find feature: ${error.message}`, error.stack);
      throw new HttpException('Error finding the feature', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, dto: UpdateFeatureDto, workspaceId: string): Promise<FeatureDto> {
    try {
      const updated = await this.featureModel.findOneAndUpdate(
        { _id: id, workspace: workspaceId },
        dto,
        { new: true },
      );
      if (!updated) throw new HttpException('Feature not found', HttpStatus.NOT_FOUND);
      return plainToClass(FeatureDto, updated.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update feature: ${error.message}`, error.stack);
      throw new HttpException('Error updating the feature', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string, workspaceId: string): Promise<FeatureDto> {
    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const deleted = await this.featureModel.findOneAndDelete(
          { _id: id, workspace: workspaceId },
          { session },
        );
        if (!deleted) throw new HttpException('Feature not found', HttpStatus.NOT_FOUND);
        // Cascade deletes here if needed
        return plainToClass(FeatureDto, deleted.toObject());
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to remove feature: ${error.message}`, error.stack);
      throw new HttpException('Error removing the feature', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

Rules:
- `@Injectable()` + `@InjectModel(Entity.name)` for model injection
- `Logger` instance: `new Logger(ClassName.name)`
- `plainToClass(Dto, doc.toObject())` for response transformation
- **All queries filter by `workspace: workspaceId`** for data isolation
- Errors: `throw new HttpException(message, HttpStatus.CODE)`
- `try/catch` wrapping all DB operations; log with `this.logger.error(msg, stack)`
- `findOneAndUpdate(filter, update, { new: true })` for updates
- `DbTransactionService.runTransaction(async (session) => {...})` for multi-doc operations
- Optional `session?: ClientSession` parameter for nested transactions
- Paginated responses: return `PaginatedDataDto<T>` with `{ data, total, limit, offset, nextPage }`

## Entity Pattern

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';

export type FeatureDocument = HydratedDocument<Feature>;

@Schema()
export class Feature {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: String, enum: SomeEnum, required: true })
  status: SomeEnum;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true, autopopulate: true })
  category: CategoryDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, autopopulate: true })
  user: UserDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Workspace' })
  workspace?: WorkspaceDocument;
}

export const FeatureSchema = SchemaFactory.createForClass(Feature).add(AuditableSchema);
```

Rules:
- Export `type FeatureDocument = HydratedDocument<Feature>`
- Extend `AuditableSchema` via `.add(AuditableSchema)` for `createdAt`/`updatedAt` + `_id → id` transform
- References: `SchemaTypes.ObjectId` + `ref` + `autopopulate: true`
- Every user-facing entity has `user` (required) and `workspace` (optional) refs
- Enums: `{ type: String, enum: EnumType }`
- Plugin: `mongoose-autopopulate` used globally

## DTO Pattern

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature name', example: 'Groceries' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Amount in base currency', example: 150.50 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Category ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  category: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;
}
```

Response DTOs use class-level `@Exclude()` + `@Expose()` only on public fields (excludes everything by default, including `_id`, `__v`, `s3Key`, and any internal fields):

```typescript
import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class FeatureDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty({ type: CategoryDto })
  @Type(() => CategoryDto)
  category: CategoryDto;
}
```

Rules:
- Input DTOs: `class-validator` decorators (`@IsString`, `@IsNumber`, `@IsMongoId`, `@IsEnum`, `@IsOptional`, `@IsPositive`)
- Date fields: `@Type(() => Date)` from `class-transformer`
- Swagger: `@ApiProperty` (required) / `@ApiPropertyOptional` (optional) with `description` and `example`
- Response DTOs: class-level `@Exclude()` + `@Expose()` only on public fields (no need to list `_id`, `__v`, etc.)
- Nested DTOs: `@Type(() => NestedDto)` for proper transformation

## Module Pattern

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Feature, FeatureSchema } from './entities/feature.entity';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }]),
    SharedModule, // provides DbTransactionService
  ],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
```

Register in `app.module.ts` imports array.

## E2E Test Pattern

Tests in `test/`. Jest + supertest. Config: `test/jest-e2e.json`.

```typescript
import * as request from 'supertest';
import { createTestApp, TestApp } from './helpers/test-app.factory';
import { loginTestUser } from './helpers/auth.helper';

describe('FeaturesController (e2e)', () => {
  let app: TestApp;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const loginResult = await loginTestUser(app);
    authToken = loginResult.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /features', () => {
    it('should create a feature', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/features')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', amount: 100, category: categoryId })
        .expect(201);

      expect(body).toHaveProperty('id');
      expect(body.name).toBe('Test');
    });
  });

  describe('GET /features', () => {
    it('should list features', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/features')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(body)).toBe(true);
    });
  });
});
```

Rules:
- `createTestApp()` mirrors `main.ts` config (ValidationPipe, ClassSerializerInterceptor)
- `loginTestUser()` returns auth token
- Set `Authorization: Bearer ${token}` on every request
- Set `x-workspace-id` header when testing workspace-scoped endpoints
- Test timeout: 30000ms (configured in `jest-e2e.json`)
- Env: `.env.test`

## Advanced Patterns

For file uploads, external service wrappers (S3, etc.), cascade deletes with deferred external cleanup, and compensation patterns, see [references/advanced-patterns.md](references/advanced-patterns.md).

Read this reference when working with:
- `FileInterceptor`, `@ApiConsumes('multipart/form-data')`, `@UploadedFile()`
- External SDK wrappers (`S3Client`, `ConfigService.getOrThrow()`)
- Cascade deletes involving external resources (collect keys in session, delete after commit)
- Upload + DB save compensation (clean up external resource on DB failure)

## File Naming

- Controllers: `src/{feature}/{feature}.controller.ts`
- Services: `src/{feature}/{feature}.service.ts`
- Modules: `src/{feature}/{feature}.module.ts`
- Entities: `src/{feature}/entities/{entity}.entity.ts`
- Enums: `src/{feature}/entities/{name}.enum.ts`
- DTOs: `src/{feature}/dto/{action}-{feature}.dto.ts` (e.g., `create-account.dto.ts`)
- Response DTOs: `src/{feature}/dto/{feature}.dto.ts`
- Guards: `src/{feature}/guards/{name}.guard.ts`
- Decorators: `src/{feature}/decorators/{name}.decorator.ts`
- E2E tests: `test/{feature}.e2e-spec.ts`
- Migrations: `migrations/{timestamp}-{name}.js`

## Key Imports

```typescript
// Shared
import { AuthenticatedRequest, Session } from 'src/shared/types';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { AuditableSchema } from 'src/shared/schemas';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { PaginatedDataDto } from 'src/shared/dto/paginated-data.dto';
import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

// Workspace
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

// Auth
import { Public } from 'src/auth/decorators/public.decorator';
```
