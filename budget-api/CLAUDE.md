# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Task | Command |
|------|---------|
| Build | `npm run build` |
| Dev server (watch) | `npm run start:dev` |
| Production | `npm run start:prod` |
| Lint (with fix) | `npm run lint` |
| Format | `npm run format` |
| All unit tests | `npm run test` |
| Single test file | `npm run test -- bills.service.spec` |
| Test by name | `npm run test -- --testNamePattern="pattern"` |
| Watch tests | `npm run test:watch` |
| E2E tests | `npm run test:e2e` |
| Coverage | `npm run test:cov` |
| Run migrations | `npm run migrate:up` |
| Rollback migration | `npm run migrate:down` |

## Architecture

NestJS + TypeScript + MongoDB (Mongoose).

### Module Structure

AppModule imports all feature modules. Each feature module follows the same pattern:
- **Controller** — HTTP layer, delegates to service
- **Service** — business logic, injected with `@InjectModel()` and other services
- **Entity** — Mongoose schema (extends `AuditableSchema` for timestamps, `BaseSchema` for `_id → id` transform)
- **DTOs** — validated with `class-validator`, transformed with `class-transformer`

Feature modules: Auth, Users, Accounts, Transactions, Bills, Budgets, Categories, AccountTypes, Currencies.
Infrastructure modules: Database, Mail, I18n (en/es), Cache (global), Config (global).

### Authentication & Guards

`JwtAuthGuard` is registered as a **global guard** (`APP_GUARD`). All endpoints require JWT by default. Mark routes as public with the `@Public()` decorator (sets metadata `isPublic: true`).

Four Passport strategies:
- **LocalStrategy** — email/password login
- **JwtStrategy** — Bearer token from Authorization header; `validate()` returns a `Session` object set on `request.user`
- **JwtRefreshStrategy** — separate secret/expiry for refresh tokens
- **GoogleStrategy** — OAuth 2.0 flow

Registration flow: register → activation code via email → verify code → set password → tokens issued. Status transitions: `UNVERIFIED → VERIFIED_NO_PASSWORD → ACTIVE`.

The `Session` type (`src/shared/types.ts`) contains `authId`, `userId`, `name`, `email`, `picture`, `currencyCode`, `refreshToken`.

### Database Transactions

`DbTransactionService` (from `SharedModule`) wraps MongoDB client sessions for multi-document atomicity:

```typescript
this.dbTransactionService.runTransaction(async (session) => {
  await this.model.create([doc], { session });
  await this.accountModel.updateOne(filter, update, { session });
});
```

Used in transactions (create/update/delete adjust account balances), bill payments, and user registration.

### Bill System

Bills support recurrence via `frequency` (ONCE, NEVER, DAILY, WEEKLY, BIWEEKLY, MONTHLY, YEARLY). Bill instances are **virtual** — generated on-the-fly by `getInstances(rangeStart, rangeEnd)` as a Mongoose schema method.

Per-instance modifications are stored in an `overrides` Map keyed by ISO date string (`YYYY-MM-DD`). Each override is a `BillModification` sub-document that can change name, amount, dueDate, frequency, mark as paid, or mark as deleted.

`applyToFuture: true` propagates changes to all subsequent unpaid instances. Paying a bill creates a linked transaction; cancelling payment removes it.

### Budget System

Budgets track spending limits per category over recurring periods (`BudgetPeriod`: WEEKLY, MONTHLY, YEARLY). A budget references one or more categories (`categories: Category[]`) and belongs to a user.

**Uniqueness constraint**: For a given user and period, no category may appear in more than one budget. Enforced at the service level on create/update (not a DB index, since `categories` is an array).

**Budget progress is virtual** — `spent`, `remaining`, and `percentUsed` are computed at query time by aggregating transactions matching the budget's categories within each period window. The `BudgetProgress` class is not persisted. Period windows are generated from `startDate` + `period`, aligned and advanced by week/month/year. `endDate` is optional (null = ongoing).

The `GET /budgets/:id/progress` endpoint accepts optional `from` and `to` query params for historical period views.

### Transaction Logic

Amounts are **negated for expenses** based on `category.categoryType === EXPENSE`. Transfers create **two linked transactions** (debit + credit) with `isTransfer: true` and a `transfer` reference to the paired record. Account balances update atomically within a DB transaction session.

### Data Isolation

All queries filter by `user: userId` extracted from the JWT session. Every service method that touches user data receives the userId from the controller.

### Naming Conventions

- Files: `{feature}.{type}.ts` — e.g., `bills.service.ts`, `create-bill.dto.ts`, `bill.entity.ts`, `bill-frequency.enum.ts`
- Entities use `@Schema()` with `SchemaFactory.createForClass()`
- DTOs use `class-validator` decorators (`@IsString`, `@IsNumber`, `@IsMongoId`, `@IsEnum`, `@IsOptional`, `@IsPositive`) and `@Type(() => Date)` for date fields
- Modules import schemas via `MongooseModule.forFeature([{ name, schema }])`
- All schemas use `mongoose-autopopulate` for referenced documents

### Validation

Global `ValidationPipe` configured in `main.ts` with `whitelist: true` (strips unknown properties) and `transform: true` (auto-converts to DTO instances). Error messages disabled in production.
