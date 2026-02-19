# Controller Decorator Reference

## Controller-Level Decorators

### @ApiTags

Add to every controller. Use the resource name (singular or plural, matching the route prefix):

```typescript
@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController { ... }
```

### @ApiBearerAuth

Add at the **controller level** when all endpoints require auth. Use the security scheme name from `DocumentBuilder.addBearerAuth()`:

```typescript
@ApiBearerAuth('JWT')
@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController { ... }
```

If only some endpoints require auth (mixed public/protected), add `@ApiBearerAuth('JWT')` at the **method level** instead of the controller level.

## Endpoint-Level Decorators

### @ApiOperation

Add to every endpoint. Use `summary` for a short one-liner and `description` for details when needed:

```typescript
@ApiOperation({ summary: 'Create a new account' })
@Post()
create(...) { ... }
```

For complex endpoints, add a description:

```typescript
@ApiOperation({
  summary: 'Pay a bill instance',
  description: 'Creates a transaction for the specified bill instance and marks it as paid. The transaction amount is negated based on the category type.',
})
```

### @ApiResponse

Document every possible response status. Use the DTO class as `type` for structured responses:

```typescript
@ApiResponse({ status: 201, description: 'Account created successfully', type: AccountDto })
@ApiResponse({ status: 400, description: 'Validation error — invalid or missing fields' })
@ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT token' })
@Post()
create(...) { ... }
```

Common response patterns per HTTP method:

| Method | Success | Common Errors |
|---|---|---|
| POST (create) | 201 Created | 400, 401 |
| GET (list) | 200 OK | 401 |
| GET (by id) | 200 OK | 400 (invalid id), 401, 404 |
| PATCH | 200 OK | 400, 401, 404 |
| DELETE | 200 OK | 400 (invalid id), 401, 404 |

### @ApiParam

For route parameters (`:id`, `:token`, etc.):

```typescript
@ApiParam({ name: 'id', description: 'Account ID', example: '507f1f77bcf86cd799439011' })
@Get(':id')
findOne(@Param('id') id: string) { ... }
```

For composite params:

```typescript
@ApiParam({ name: 'id', description: 'Bill ID' })
@ApiParam({ name: 'targetDate', description: 'Bill instance date (YYYY-MM-DD)', example: '2025-03-15' })
@Post(':id/:targetDate/pay')
```

### @ApiQuery

For query parameters. Infer from DTO properties when a query DTO is used:

```typescript
@ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 20 })
@ApiQuery({ name: 'offset', required: false, description: 'Skip results', example: 0 })
@Get()
findAll(@Query() pagination: PaginationDto) { ... }
```

When using a DTO class for query params, you can use `@ApiQuery({ type: PaginationDto })` instead of individual params — but only if the DTO has `@ApiProperty()` decorators.

### @ApiExcludeEndpoint

For internal or OAuth callback endpoints not useful in the API docs:

```typescript
@ApiExcludeEndpoint()
@Get('google-redirect')
googleRedirect(...) { ... }
```

## Auth-Specific Patterns

### Public Endpoints

For endpoints with `@Public()`, do NOT add `@ApiBearerAuth()`. If the controller has `@ApiBearerAuth()` at the class level, override at the method level with an explicit note:

```typescript
@ApiBearerAuth('JWT')  // controller level
@Controller('auth')
export class AuthController {

  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered. Activation code sent via email.' })
  @Post('register')
  register(...) { ... }
}
```

Swagger will still show the lock icon, but the description clarifies no auth is needed. Alternatively, apply `@ApiBearerAuth()` only on protected methods.

### Multiple Guard Types

For endpoints using different guards (LocalAuthGuard, JwtRefreshGuard):

```typescript
@ApiOperation({ summary: 'Login with email and password' })
@ApiBody({ type: LoginDto })
@Post('login')
@UseGuards(LocalAuthGuard)
login(...) { ... }
```

Use `@ApiBody()` explicitly when the body DTO isn't obvious from the method signature (e.g., when the guard consumes it).

## Grouping with @ApiTags

For a clean Swagger UI, group related endpoints:

| Controller | Tag |
|---|---|
| AuthController | `Auth` |
| UsersController | `Users` |
| AccountsController | `Accounts` |
| TransactionsController | `Transactions` |
| BillsController | `Bills` |
| BudgetsController | `Budgets` |
| CategoriesController | `Categories` |
| AccountTypesController | `Account Types` |
| CurrenciesController | `Currencies` |
