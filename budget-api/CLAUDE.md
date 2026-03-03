# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Task | Command |
|------|---------|
| Build | `npm run build` |
| Dev server (watch) | `npm run start:dev` |
| Dev server (e2e env) | `npm run start:e2e` |
| Production | `npm run start:prod` |
| Lint (with fix) | `npm run lint` |
| Format | `npm run format` |
| E2E tests | `npm run test:e2e` |
| Run migrations | `npm run migrate:up` |
| Rollback migration | `npm run migrate:down` |
| Create migration | `npm run migrate:create` |
| Migration status | `npm run migrate:status` |

## Architecture

NestJS + TypeScript + MongoDB (Mongoose).

### Module Structure

AppModule imports all feature modules. Each feature module follows the same pattern:
- **Controller** — HTTP layer, delegates to service
- **Service** — business logic, injected with `@InjectModel()` and other services
- **Entity** — Mongoose schema (extends `AuditableSchema` for timestamps, `BaseSchema` for `_id → id` transform)
- **DTOs** — validated with `class-validator`, transformed with `class-transformer`, documented with `@nestjs/swagger` decorators (`@ApiProperty`, `@ApiPropertyOptional`)

Feature modules: Auth, Users, Accounts, Transactions, Bills, Budgets, Categories, AccountTypes, Currencies, **Workspaces**.
Infrastructure modules: Database, Mail, I18n (en/es), Cache (global), Config (global).

### Authentication & Guards

**Global guard stack** (registered as `APP_GUARD`, executed in order):
1. **JwtAuthGuard** — validates JWT Bearer token; extracts `Session` into `request.user`
2. **WorkspaceGuard** — reads `x-workspace-id` header, validates membership, defaults to user's first workspace; sets `workspaceId` and `workspaceRole` on `request.user`
3. **RolesGuard** — enforces `@Roles(...)` decorator; OWNER has implicit access to all endpoints

All endpoints require JWT by default. Mark routes as public with `@Public()` (sets metadata `isPublic: true`).

Four Passport strategies:
- **LocalStrategy** — email/password login
- **JwtStrategy** — Bearer token from Authorization header; `validate()` returns a `Session` object set on `request.user`
- **JwtRefreshStrategy** — separate secret/expiry for refresh tokens
- **GoogleStrategy** — OAuth 2.0 flow

Registration flow: register → activation code via email → verify code → set password → tokens issued.

The `AuthenticationProvider` entity tracks auth methods separately with status transitions: `UNVERIFIED → VERIFIED_NO_PASSWORD → ACTIVE`. Types: `EMAIL`, `GOOGLE`.

The `Session` type (`src/shared/types.ts`) contains `authId`, `userId`, `name`, `email`, `picture`, `currencyCode`, `refreshToken`, `isLongLived`, `workspaceId`, `workspaceRole`.

### Workspace System

Multi-tenant workspace support with role-based access control.

**Entities**:
- `Workspace` — has an `owner` (User ref)
- `WorkspaceMember` — links workspace + user + role
- `Invitation` — email-based invites with token, status, and expiry

**Roles** (`WorkspaceRole` enum): `OWNER`, `CONTRIBUTOR`, `VIEWER`. OWNER has implicit access to everything.

**Invitation statuses** (`InvitationStatus` enum): `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`.

**Data isolation**: All user-facing entities (accounts, transactions, bills, budgets, categories) reference both `user` and `workspace`. Queries filter by `workspace: workspaceId` extracted from the session.

**Decorators**: `@Roles(WorkspaceRole.OWNER)` restricts endpoints to specific workspace roles.

### Database Transactions

`DbTransactionService` (from `SharedModule`) wraps MongoDB client sessions for multi-document atomicity:

```typescript
this.dbTransactionService.runTransaction(async (session) => {
  await this.model.create([doc], { session });
  await this.accountModel.updateOne(filter, update, { session });
});
```

Used in transactions (create/update/delete adjust account balances), bill payments, user registration, and workspace creation.

### Bill System

Bills support recurrence via `frequency` (ONCE, NEVER, DAILY, WEEKLY, BIWEEKLY, MONTHLY, YEARLY). Bill instances are **virtual** — generated on-the-fly by `getInstances(rangeStart, rangeEnd)` as a Mongoose schema method. Single instances via `getInstance(targetDate)`.

Per-instance modifications are stored in an `overrides` Map keyed by ISO date string (`YYYY-MM-DD`). Each override is a `BillModification` sub-document that can change name, amount, dueDate, frequency, mark as paid, or mark as deleted.

`applyToFuture: true` propagates changes to all subsequent unpaid instances via `updateInstance()`. Paying a bill creates a linked transaction; cancelling payment removes it.

Bill statuses (`BillStatus` enum): `UPCOMING`, `DUE`, `OVERDUE`, `PAID`.

### Budget System

Budgets track spending limits per category over recurring periods (`BudgetPeriod`: WEEKLY, MONTHLY, YEARLY). A budget references one or more categories (`categories: Category[]`) and belongs to a user and workspace.

**Uniqueness constraint**: For a given user and period, no category may appear in more than one budget. Enforced at the service level on create/update (not a DB index, since `categories` is an array).

**Budget progress is virtual** — `spent`, `remaining`, and `percentUsed` are computed at query time by aggregating transactions matching the budget's categories within each period window. The `BudgetProgress` class is not persisted. Period windows are generated from `startDate` + `period`, aligned and advanced by week/month/year. `endDate` is optional (null = ongoing).

The `GET /budgets/:id/progress` endpoint accepts optional `from` and `to` query params for historical period views.

### Transaction Logic

Amounts are **negated for expenses** based on `category.categoryType === EXPENSE`. Transfers create **two linked transactions** (debit + credit) with `isTransfer: true` and a `transfer` reference to the paired record. Account balances update atomically within a DB transaction session.

### Shared Module & DTOs

`src/shared/` provides cross-cutting utilities:
- `DbTransactionService` — MongoDB transaction wrapper
- `BaseSchema` / `AuditableSchema` — base schemas for all entities
- `Session` type — JWT session interface
- `CurrencyCode` enum — supported currencies (USD, COP)

Shared DTOs (`src/shared/dto/`):
- `PaginationDto` — `limit`, `offset` query params
- `PaginatedDataDto<T>` — `data[]`, `total`, `limit`, `offset`, `nextPage`
- `DateRangeDto` — `dateStart`, `dateEnd`

### Migrations

Uses `migrate-mongo` with migration files in `/migrations/`. Migrations are plain JS files with `up(db, client)` / `down(db, client)` methods that receive the MongoDB driver directly.

### E2E Tests

Located in `/test/`. Uses Jest with `supertest`. Test infrastructure:
- `test-app.factory.ts` — creates NestJS test app mirroring main.ts config (ValidationPipe, ClassSerializerInterceptor)
- `auth.helper.ts` — auth utilities for test user login
- `mailpit.helper.ts` — Mailpit integration for email verification in tests
- `db.helper.ts` — database setup/teardown

Coverage: app, auth, users, accounts, categories, transactions, bills, budgets, workspaces, account-types.

Config: `test/jest-e2e.json` (testTimeout: 30000ms). Env: `.env.test`.

### API Documentation

Swagger UI is available at `/api/docs` with Bearer JWT authentication and `persistAuthorization` enabled. All controllers use `@ApiTags`, and DTOs use `@ApiProperty`/`@ApiPropertyOptional` with descriptions and examples.

### Naming Conventions

- Files: `{feature}.{type}.ts` — e.g., `bills.service.ts`, `create-bill.dto.ts`, `bill.entity.ts`, `bill-frequency.enum.ts`
- Entities use `@Schema()` with `SchemaFactory.createForClass()`
- DTOs use `class-validator` decorators (`@IsString`, `@IsNumber`, `@IsMongoId`, `@IsEnum`, `@IsOptional`, `@IsPositive`) and `@Type(() => Date)` for date fields
- Modules import schemas via `MongooseModule.forFeature([{ name, schema }])`
- All schemas use `mongoose-autopopulate` for referenced documents

### Validation

Global `ValidationPipe` configured in `main.ts` with `whitelist: true` (strips unknown properties) and `transform: true` (auto-converts to DTO instances). Error messages disabled in production.

Global `ClassSerializerInterceptor` enables `@Exclude()`/`@Expose()` decorators on DTOs and entities.

### Status & Health

- `GET /` — returns app name, version, status, commit
- `GET /health` — public health check endpoint
