# Codebase Analysis Reference

How to analyze a NestJS codebase before generating e2e tests.

## Step 1 — Detect Infrastructure

### ORM Detection

Check `package.json` dependencies for:

| ORM | Indicator Package | Schema Location |
|---|---|---|
| Mongoose | `@nestjs/mongoose`, `mongoose` | `*.entity.ts` with `@Schema()` |
| TypeORM | `@nestjs/typeorm`, `typeorm` | `*.entity.ts` with `@Entity()` |
| Prisma | `@prisma/client`, `prisma` | `prisma/schema.prisma` |
| MikroORM | `@mikro-orm/core`, `@mikro-orm/nestjs` | `*.entity.ts` with `@Entity()` from mikro-orm |
| Drizzle | `drizzle-orm`, `drizzle-kit` | `*.schema.ts` with drizzle table definitions |

### Test Runner Detection

Check for config files and `package.json`:

| Runner | Indicator |
|---|---|
| Jest | `jest.config.ts`, `jest.config.js`, `jest` key in `package.json`, `jest-e2e.json` |
| Vitest | `vitest.config.ts`, `vitest` key in `package.json` |

### Auth Strategy Detection

Scan for auth patterns:

1. **Global guard**: Search for `APP_GUARD` provider in module files
2. **Guard types**: Search for classes extending `AuthGuard('jwt')`, `AuthGuard('local')`, etc.
3. **Public decorator**: Search for `@Public()` or `SetMetadata('isPublic', true)`
4. **Passport strategies**: Search for classes extending `PassportStrategy`
5. **JWT config**: Check for `@nestjs/jwt` in dependencies, `JwtModule.register` or `JwtModule.registerAsync` in modules

### Database Connection

- Check database module for connection config
- Look for `MONGODB_URI`, `DATABASE_URL`, or similar env vars
- Identify if `ConfigModule` is used (for env-based config)

## Step 2 — Map the API Surface

### Controller Analysis

For each controller file (`*.controller.ts`):

1. **Route prefix**: Extract from `@Controller('prefix')` decorator
2. **Endpoints**: Extract each method decorated with `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
   - Route path from decorator argument
   - Route parameters from `:param` patterns
   - Query parameters from `@Query()` decorator usage
   - Body from `@Body()` decorator with DTO type reference
3. **Guards**: Check for `@UseGuards()` at class or method level
4. **Public routes**: Check for `@Public()` decorator
5. **Request object**: Check for `@Request() req` — indicates auth session access

### DTO Analysis

For each DTO file (`*.dto.ts`):

1. **Validation decorators**: `@IsString`, `@IsNotEmpty`, `@IsEmail`, `@IsMongoId`, `@IsEnum`, `@IsNumber`, `@IsPositive`, `@IsOptional`, `@IsDate`, `@IsBoolean`, `@Min`, `@Max`
2. **Transformation**: `@Type(() => Date)`, `@Type(() => Number)`
3. **Required vs optional**: Properties without `@IsOptional()` are required
4. **Enum references**: `@IsEnum(EnumType)` — note the enum values for test data
5. **Nested types**: `@ValidateNested()` with `@Type(() => NestedDto)`

### Entity Relationship Mapping

For each entity, identify:
- References to other entities (e.g., `account` references `Account`)
- Which entities must exist before others can be created (dependency order)
- Cascade behavior (does deleting a parent affect children?)

Build a dependency graph for test data seeding order. Example:
```
AccountType → (no deps, seed first)
User → (no deps, seed first)
Category → User
Account → User, AccountType
Transaction → User, Account, Category
Bill → User, Account, Category
```

## Step 3 — Check Existing Tests

1. Search for `*.e2e-spec.ts` files
2. For each existing test file, extract which endpoints are covered
3. Compare against the full API surface map
4. Only generate tests for uncovered endpoints
5. **Never overwrite existing test files** without explicit user confirmation

## Step 4 — Identify Global Middleware

Check `main.ts` for:
- `app.useGlobalPipes()` — ValidationPipe config (transform, whitelist, error messages)
- `app.useGlobalInterceptors()` — ClassSerializerInterceptor, etc.
- `app.useGlobalFilters()` — Exception filters
- `app.setGlobalPrefix()` — API prefix (e.g., `/api/v1`)
- `app.enableCors()` — CORS settings

These must be replicated in the test app bootstrap to match production behavior.
