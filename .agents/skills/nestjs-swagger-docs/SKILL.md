---
name: nestjs-swagger-docs
description: >
  Add comprehensive Swagger/OpenAPI documentation to NestJS applications by decorating
  existing controllers and DTOs with @nestjs/swagger decorators. Handles full setup:
  install packages, configure SwaggerModule in main.ts, add @ApiTags/@ApiBearerAuth on
  controllers, @ApiOperation/@ApiResponse/@ApiParam/@ApiQuery on endpoints, and
  @ApiProperty with realistic examples on all DTO properties. Detects auth guards,
  public routes, and DTO validation rules to generate accurate documentation.
  Triggers: "add Swagger", "add OpenAPI docs", "document my API", "set up Swagger",
  "generate API docs", "make API client-ready", "add API documentation", or when the
  user asks to make endpoints discoverable, add interactive docs, or generate an OpenAPI
  spec for a NestJS project.
---

# NestJS Swagger Documentation

Add complete Swagger/OpenAPI documentation to a NestJS API by decorating source files.

## Workflow

1. **Analyze** — Scan codebase to map controllers, DTOs, guards, and current Swagger state
2. **Setup** — Install `@nestjs/swagger`, configure `SwaggerModule` in `main.ts`
3. **Decorate DTOs** — Add `@ApiProperty` / `@ApiPropertyOptional` with descriptions and examples
4. **Decorate Controllers** — Add `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`
5. **Fix Mapped Types** — Switch `PartialType`/`PickType`/`OmitType` imports to `@nestjs/swagger`
6. **Verify** — Build the project, start the dev server, confirm Swagger UI loads

## Step 1 — Analyze

Before changing any code:

1. Check `package.json` for `@nestjs/swagger` — skip install if already present
2. Check `main.ts` for existing `SwaggerModule.setup()` — skip setup if present
3. Glob `**/*.controller.ts` — list all controllers, their route prefixes, endpoints, guards, DTOs
4. Glob `**/*.dto.ts` — list all DTOs, identify input vs output DTOs
5. Check for `@Public()` decorator usage — identify public endpoints
6. Check for existing `@ApiTags`, `@ApiProperty` etc. — avoid duplicating decorators
7. Check for `PartialType`, `PickType`, `OmitType` imports from `@nestjs/mapped-types` — these need switching
8. Identify the auth scheme — global `JwtAuthGuard` via `APP_GUARD`, method-level guards, passport strategies

## Step 2 — Setup

Read [references/setup.md](references/setup.md) for installation, bootstrap configuration, and CLI plugin options.

1. Install `@nestjs/swagger` (and `swagger-ui-express` for Express apps)
2. Add `SwaggerModule` setup to `main.ts`:
   - `DocumentBuilder` with title, description, version, and `addBearerAuth()` for JWT
   - `SwaggerModule.setup('api/docs', app, documentFactory)` with `persistAuthorization: true`
3. Optionally enable the CLI plugin in `nest-cli.json` for auto-inference from TypeScript types

**Placement in main.ts**: Add after global pipes/interceptors, before `app.listen()`.

## Step 3 — Decorate DTOs

Read [references/dto-decorators.md](references/dto-decorators.md) for the full mapping of validation decorators to `@ApiProperty` fields and example values.

### Input DTOs (Create, Update, Query)

Add `@ApiProperty()` or `@ApiPropertyOptional()` to every property:

```typescript
@ApiProperty({ description: 'Account display name', example: 'Main Checking' })
@IsNotEmpty()
@IsString()
name: string;
```

Key rules:
- Place `@ApiProperty` **before** validation decorators for consistent ordering
- Use `@ApiPropertyOptional()` for properties with `@IsOptional()`
- Include `enum` and `enumName` for enum fields
- Include `example` with realistic, domain-appropriate values on every property
- Use `type: 'string', format: 'date-time'` for Date fields
- Use `type: [String]` for array fields, with array example values

### Output DTOs (Response)

Add `@ApiProperty()` to every property so Swagger renders response schemas:

```typescript
@ApiProperty({ description: 'Account ID', example: '507f1f77bcf86cd799439011' })
id: string;
```

For nested objects, use lazy type reference to avoid circular issues:
```typescript
@ApiProperty({ type: () => CategoryDto })
```

### Processing Order

Decorate DTOs **before** controllers, since `@ApiResponse({ type: SomeDto })` references DTOs.

Process in dependency order:
1. Shared DTOs (PaginationDto, DateRangeDto)
2. Simple entity DTOs (AccountTypeDto, CategoryDto, UserDto, CurrencyDto)
3. Complex entity DTOs (AccountDto, TransactionDto, BillDto, BudgetDto)
4. Input DTOs (Create*, Update*, Query DTOs)

## Step 4 — Decorate Controllers

Read [references/controller-decorators.md](references/controller-decorators.md) for decorator reference with patterns for auth, params, and queries.

### Per controller:

1. Add `@ApiTags('ResourceName')` at the class level
2. Add `@ApiBearerAuth('JWT')` at the class level if all endpoints require auth — otherwise add per-method

### Per endpoint:

1. `@ApiOperation({ summary: '...' })` — short description of what it does
2. `@ApiResponse({ status: 2xx, description: '...', type: ResponseDto })` — success response
3. `@ApiResponse({ status: 400, description: 'Validation error' })` — if accepts a body/params
4. `@ApiResponse({ status: 401, description: 'Unauthorized' })` — if protected
5. `@ApiResponse({ status: 404, description: 'Resource not found' })` — if has `:id` param
6. `@ApiParam(...)` — for each route parameter
7. `@ApiQuery(...)` — for query parameters (or reference the query DTO type)
8. `@ApiBody({ type: DtoClass })` — only when body type isn't obvious from method signature

### Special Cases

- **Public endpoints**: Do not add `@ApiBearerAuth()`, omit 401 response
- **OAuth callbacks**: Add `@ApiExcludeEndpoint()` on redirect/callback handlers
- **Login endpoint**: Use `@ApiBody({ type: LoginDto })` since the guard consumes the body
- **Endpoints returning arrays**: Use `@ApiResponse({ type: [EntityDto] })`

## Step 5 — Fix Mapped Types

Search for imports of `PartialType`, `PickType`, `OmitType`, `IntersectionType` from `@nestjs/mapped-types` and switch to `@nestjs/swagger`:

```typescript
// Before
import { PartialType } from '@nestjs/mapped-types';
// After
import { PartialType } from '@nestjs/swagger';
```

This ensures Swagger metadata propagates correctly to derived DTOs.

## Step 6 — Verify

1. Run `npm run build` — confirm no compilation errors
2. Run `npm run start:dev` — start the dev server
3. Navigate to the Swagger UI URL (e.g., `http://localhost:3000/api/docs`)
4. Spot-check: endpoints are grouped by tag, request/response schemas render, auth lock icon appears

## Scope Control

If the user requests documentation for a subset:
- **Specific module**: Only decorate that module's controller and DTOs
- **Specific endpoint**: Only add decorators to that endpoint and its request/response DTOs
- **Setup only**: Just install and configure SwaggerModule, skip decorators

When documenting incrementally, always check for existing decorators to avoid duplicates.
