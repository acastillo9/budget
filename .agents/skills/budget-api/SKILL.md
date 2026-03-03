---
name: budget-api
description: >
  Contextualized patterns for the budget-api NestJS backend (budget-api/).
  Use when creating, editing, or reviewing any code inside budget-api/ including
  modules, controllers, services, entities, DTOs, guards, tests, or migrations.
  Triggers on work in budget-api/ such as adding endpoints, creating features,
  fixing bugs, writing tests, or modifying schemas.
---

# Budget API Patterns

Root: `budget-api/`. NestJS + TypeScript + MongoDB (Mongoose).

## Module Structure

Each feature module follows this layout:

```
feature/
  feature.module.ts
  feature.controller.ts
  feature.service.ts
  dto/
    create-feature.dto.ts
    update-feature.dto.ts
    feature.dto.ts          # Response DTO
  entities/
    feature.entity.ts
    feature-*.enum.ts
```

Module registration:

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }]),
  ],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
```

## Entity Pattern

```typescript
@Schema()
export class Feature {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, autopopulate: true })
  user: UserDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Workspace', required: true })
  workspace: WorkspaceDocument;

  @Prop({ type: String, enum: SomeEnum })
  status: string;

  @Prop({ type: Date })
  @Type(() => Date)
  date: Date;
}

export type FeatureDocument = HydratedDocument<Feature>;
export const FeatureSchema = SchemaFactory.createForClass(Feature).add(AuditableSchema);
```

Rules:
- Use `AuditableSchema` (timestamps) for user-facing entities, `BaseSchema` for auth entities
- All foreign refs: `SchemaTypes.ObjectId` + `ref` + `autopopulate: true`
- All user-facing entities must have both `user` and `workspace` refs for multi-tenancy
- Define indexes after schema creation: `FeatureSchema.index({ workspace: 1, user: 1 })`
- `HydratedDocument<T>` as the document type alias

## Controller Pattern

```typescript
@ApiTags('Features')
@ApiBearerAuth('JWT')
@Controller('features')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @ApiOperation({ summary: 'Create a feature' })
  @ApiResponse({ status: 201, type: FeatureDto })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateFeatureDto) {
    return this.featureService.create(dto, req.user.userId, req.user.workspaceId);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.featureService.findAll(req.user.workspaceId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeatureDto, @Request() req: AuthenticatedRequest) {
    return this.featureService.update(id, dto, req.user.workspaceId);
  }

  @Delete(':id')
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.featureService.remove(id, req.user.workspaceId);
  }
}
```

Rules:
- `@Request() req: AuthenticatedRequest` — pass `req.user.userId` and `req.user.workspaceId` to service
- Write operations require `@Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)`
- Read operations have no `@Roles` — all authenticated users can read
- Use `@Public()` only for unauthenticated routes
- Always include `@ApiTags`, `@ApiBearerAuth('JWT')`, `@ApiOperation`, `@ApiResponse`

## Service Pattern

```typescript
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(@InjectModel(Feature.name) private featureModel: Model<Feature>) {}

  async create(dto: CreateFeatureDto, userId: string, workspaceId: string): Promise<FeatureDto> {
    try {
      const doc = new this.featureModel({ ...dto, user: userId, workspace: workspaceId });
      const saved = await doc.save();
      return plainToClass(FeatureDto, saved.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create: ${error.message}`, error.stack);
      throw new HttpException('Error creating feature', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(workspaceId: string): Promise<FeatureDto[]> {
    const docs = await this.featureModel.find({ workspace: workspaceId }).sort({ createdAt: -1 });
    return docs.map((d) => plainToClass(FeatureDto, d.toObject()));
  }

  async findById(id: string, workspaceId: string): Promise<FeatureDto> {
    const doc = await this.featureModel.findOne({ _id: id, workspace: workspaceId });
    if (!doc) throw new HttpException('Feature not found', HttpStatus.NOT_FOUND);
    return plainToClass(FeatureDto, doc.toObject());
  }

  async update(id: string, dto: UpdateFeatureDto, workspaceId: string): Promise<FeatureDto> {
    const doc = await this.featureModel.findOneAndUpdate(
      { _id: id, workspace: workspaceId },
      dto,
      { new: true },
    );
    if (!doc) throw new HttpException('Feature not found', HttpStatus.NOT_FOUND);
    return plainToClass(FeatureDto, doc.toObject());
  }

  async remove(id: string, workspaceId: string): Promise<FeatureDto> {
    const doc = await this.featureModel.findOneAndDelete({ _id: id, workspace: workspaceId });
    if (!doc) throw new HttpException('Feature not found', HttpStatus.NOT_FOUND);
    return plainToClass(FeatureDto, doc.toObject());
  }
}
```

Rules:
- All queries filter by `workspace: workspaceId` for multi-tenancy
- Always convert: `plainToClass(FeatureDto, doc.toObject())` — never return raw Mongoose docs
- Error handling: re-throw `HttpException` first, log with `this.logger.error`, then throw generic 500
- HTTP status codes: 404 (not found), 400 (business rule), 409 (conflict), 429 (rate limit), 500 (unexpected)
- Accept optional `session?: ClientSession` for transactional operations

## DTO Patterns

**Create DTO** — validation + Swagger:

```typescript
export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature name', example: 'My Feature' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Related entity ID', example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsMongoId()
  relatedId?: string;

  @ApiProperty({ enum: FeatureType, example: FeatureType.DEFAULT })
  @IsEnum(FeatureType)
  type: string;

  @ApiProperty({ description: 'Start date', example: '2024-01-01' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;
}
```

**Update DTO** — always extend with `PartialType`:

```typescript
export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}
```

**Response DTO** — no validation, only `@ApiProperty` + `@Type` for nested:

```typescript
export class FeatureDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: () => UserDto }) @Type(() => UserDto) user: UserDto;
}
```

Rules:
- Date fields: `@IsDate()` + `@Type(() => Date)`
- Number query params: `@Type(() => Number)`
- Nested objects: `@ValidateNested()` + `@Type(() => NestedDto)`
- All `@ApiProperty` include `description` and `example`
- Conditional validation: `@ValidateIf((o) => !o.someField)`
- Paginated responses use `PaginatedDataDto<T>` from `src/shared/dto/`

## Auth & Guards

Global guard stack (all endpoints by default):
1. `JwtAuthGuard` — JWT Bearer validation
2. `WorkspaceGuard` — reads `x-workspace-id` header, sets `workspaceId`/`workspaceRole`
3. `RolesGuard` — enforces `@Roles()`, OWNER bypasses all

`Session` on `req.user`: `authId`, `userId`, `workspaceId`, `workspaceRole`, `name`, `email`, `currencyCode`.

Use `@Public()` to bypass all guards.

## DB Transactions

```typescript
this.dbTransactionService.runTransaction(async (session) => {
  await this.model.create([doc], { session });
  await this.otherModel.updateOne(filter, update, { session });
});
```

Use for operations that modify multiple collections atomically (transfers, bill payments, registration).

## E2E Tests

Located in `test/`. Pattern:

```typescript
describe('FeatureController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);
    const result = await createActiveUser(app, { email: 'test@test.com', password: 'Pass1234!' });
    workspaceId = result.workspaceId;
    authToken = getAuthToken(app, { authId: result.authProviderId, userId: result.userId });
  });

  afterAll(async () => { await clearDatabase(app); await app.close(); });

  it('should create', async () => {
    const res = await request(app.getHttpServer())
      .post('/features')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-workspace-id', workspaceId)
      .send({ name: 'Test' });
    expect(res.status).toBe(201);
  });
});
```

Helpers in `test/utils/`: `createTestApp()`, `clearDatabase()`, `createActiveUser()`, `getAuthToken()`, `seedCategory()`, `seedAccount()`, `seedTransaction()`, `seedBill()`, `seedBudget()`.

## File Naming

`{feature}.{type}.ts` — e.g., `bills.service.ts`, `create-bill.dto.ts`, `bill.entity.ts`, `bill-frequency.enum.ts`.

## Key Imports

```typescript
// Entities & schemas
import { BaseSchema, AuditableSchema } from '../shared/schemas';
import { Session, AuthenticatedRequest } from '../shared/types';

// Decorators
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../workspaces/decorators/roles.decorator';
import { WorkspaceRole } from '../workspaces/entities/workspace-role.enum';

// Shared DTOs
import { PaginationDto } from '../shared/dto/pagination.dto';
import { PaginatedDataDto } from '../shared/dto/paginated-data.dto';
import { DateRangeDto } from '../shared/dto/date-range.dto';
```
