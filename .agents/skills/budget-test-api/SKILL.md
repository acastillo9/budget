---
name: budget-test-api
description: >
  Write E2E tests for the budget-api NestJS backend. Use when creating, modifying,
  or reviewing E2E test files in budget-api/test/. The agent receives detailed feature
  information (controller endpoints, service logic, DTOs, entities) in its prompt and
  produces comprehensive test coverage. Triggers on: "write E2E tests for...",
  "create tests for the new feature", "add test coverage for...", "test the X endpoint".
---

# E2E Test Writing — budget-api

## Test Infrastructure

All imports from `./utils/` relative to `budget-api/test/`.

### `createTestApp()` — `test-app.factory.ts`

```typescript
import { createTestApp } from './utils/test-app.factory';
// Returns INestApplication with ValidationPipe + ClassSerializerInterceptor
```

### Auth helpers — `auth.helper.ts`

```typescript
import { getAuthToken, getRefreshToken } from './utils/auth.helper';

getAuthToken(app, { authId: string, userId: string }): string
// JWT access token (15m), payload: { sub: authId, userId }

getRefreshToken(app, { authId: string, isLongLived?: boolean }): string
// JWT refresh token (2h), payload: { sub: authId, isLongLived }
```

### DB helpers — `db.helper.ts`

```typescript
import {
  clearDatabase, createActiveUser, createUnverifiedUser,
  createVerifiedNoPasswordUser, nonExistentId, getAccountTypeId,
  seedCategory, seedAccount, seedBill, seedBudget,
  seedTransaction, getAccountBalance,
} from './utils/db.helper';

clearDatabase(app): Promise<void>
// Clears all collections except accounttypes (managed by migrations)

createActiveUser(app, { email, password, name?, currencyCode? })
  : Promise<{ userId, authProviderId, workspaceId }>

createUnverifiedUser(app, { email, activationCode, name?, activationCodeResendAt? })
  : Promise<{ userId, authProviderId }>

createVerifiedNoPasswordUser(app, { email, name? })
  : Promise<{ userId, authProviderId, setPasswordToken }>

nonExistentId(): string  // Random valid ObjectId

getAccountTypeId(app, name: string): Promise<string>
// Lookup migration-seeded type: CHECKING, SAVINGS, CREDIT_CARD, CASH, INVESTMENT, LOAN, OTHER

seedCategory(app, { name, icon, categoryType, user, parent?, workspace? }): Promise<string>
seedAccount(app, { name, balance, currencyCode, accountType, user, workspace? }): Promise<string>
seedBill(app, { name, amount, dueDate, frequency, account, category, user, endDate?, workspace? }): Promise<string>
seedBudget(app, { name?, amount, period, startDate, endDate?, categories, user, workspace? }): Promise<string>
seedTransaction(app, { amount, date, description?, category?, account, user, isTransfer?, workspace? }): Promise<string>
seedAttachment(app, { filename, s3Key, mimeType, size, transaction, user, workspace }): Promise<string>
getAccountBalance(app, accountId: string): Promise<number>
```

### Mailpit helper — `mailpit.helper.ts`

```typescript
import { MailpitHelper } from './utils/mailpit.helper';

const mailpit = new MailpitHelper();
await mailpit.deleteAllMessages();
const msg = await mailpit.getLatestMessage(email, { timeout?, interval? });
const code = mailpit.extractActivationCode(msg.HTML);
const link = mailpit.extractResetPasswordLink(msg.HTML);
const token = mailpit.extractSetPasswordToken(link);
```

## Test Template

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import { clearDatabase, createActiveUser } from './utils/db.helper';

describe('FeatureController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const result = await createActiveUser(app, {
      email: 'feature-unique@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    workspaceId = result.workspaceId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });

    // Seed additional data here
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /feature
  // ──────────────────────────────────────────────────
  describe('POST /feature', () => {
    it('should create with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ /* valid payload */ });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ /* expected fields */ });
      expect(response.body.id).toBeDefined();
    });
  });
});
```

## Test Cases per CRUD Operation

### CREATE (POST)
- Valid data → 201 with correct body
- Missing required fields → 400
- Invalid field values (wrong type, out of range) → 400
- Duplicate (if uniqueness constraint) → 409
- Non-existent referenced ID (e.g., accountType) → 404
- Unauthenticated → 401

### READ (GET list)
- Return all user-owned records (filtered by workspace)
- Pagination: `limit`, `offset`, response includes `total`, `nextPage`
- Date filtering: `dateStart`, `dateEnd` if applicable
- Empty list → 200 with `data: []`

### READ (GET :id)
- Valid ID → 200 with full object
- Non-existent ID → 404
- ID owned by another user → 404 (not 403, data isolation)

### UPDATE (PATCH/PUT)
- Valid partial update → 200
- Non-existent ID → 404
- Invalid values → 400

### DELETE
- Valid ID → 200
- Non-existent ID → 404
- Cascade effects (verify related records deleted/updated)

## Domain-Specific Patterns

**Balance tracking**: After creating/updating/deleting transactions, verify account balance with `getAccountBalance()`.

**Transfers**: Create via POST with `isTransfer: true` + `transferAccountId`. Verify two linked transactions and both account balances.

**Amount negation**: Expense transactions store negative amounts. Send positive amount; verify stored as negative when category is EXPENSE.

**Date filtering**: Use `dateStart`/`dateEnd` query params. Seed transactions across dates, verify only matching ones return.

**Pagination**: Send `limit` and `offset`. Verify `total` count, `data.length`, and `nextPage` URL or null.

**Bill instances**: Bill instances are virtual (computed from frequency). Test via `GET /bills/:id/instances?rangeStart=...&rangeEnd=...`.

**Budget progress**: Budget `spent`/`remaining`/`percentUsed` are computed from transactions. Seed transactions then verify progress endpoint.

## Mocking External Providers

When a feature depends on an external service (S3, email, etc.), mock the provider in tests.

### Pattern: Override provider before compilation

```typescript
import { createTestApp } from './utils/test-app.factory';

// Mock class implementing the same interface as the real service
class MockS3Service {
  private store = new Map<string, Buffer>();

  async upload(key: string, buffer: Buffer): Promise<string> {
    this.store.set(key, buffer);
    return key;
  }
  async delete(key: string): Promise<void> { this.store.delete(key); }
  async getPresignedUrl(key: string): Promise<string> { return `https://mock-s3/${key}`; }
}

// Override the real provider BEFORE compile
const moduleRef = Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(S3Service)
  .useClass(MockS3Service);
app = await createTestApp(moduleRef);
```

### Multipart file upload with supertest

```typescript
const response = await request(app.getHttpServer())
  .post(`/transactions/${transactionId}/attachments`)
  .set('Authorization', `Bearer ${authToken}`)
  .attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
    filename: 'receipt.jpg',
    contentType: 'image/jpeg',
  })
  .expect(201);
```

Rules:
- Mock external services using `overrideProvider().useClass()` before `.compile()`
- Mock class must implement the same public interface as the real service
- Use `.attach('file', buffer, { filename, contentType })` for multipart uploads (not `.send()`)
- Seed attachments with `seedAttachment()` for tests that need pre-existing attachments

Source: `budget-api/test/attachments.e2e-spec.ts`

## Rules

1. One `describe` block per controller, named `'ControllerName (e2e)'`
2. Nested `describe` per endpoint: `'METHOD /path'`
3. Call `clearDatabase(app)` in `beforeAll` and `afterAll`
4. Use unique emails per test file (e.g., `feature@example.com`) to avoid collisions if tests run in parallel
5. Store created resource IDs in outer-scope `let` variables for use across tests
6. Always set `Authorization` header: `.set('Authorization', \`Bearer ${authToken}\`)`
7. Test both success and error paths for every endpoint
8. Verify response status codes explicitly: `expect(response.status).toBe(201)`
9. Use `toMatchObject` for partial matching, `toHaveProperty` for nested fields
10. Use `nonExistentId()` for 404 tests, never hardcode IDs
11. Seed prerequisite data in `beforeAll` (accounts, categories, etc.)
12. Test data isolation: records from other users must not be accessible
13. Verify cascade deletes when applicable (e.g., deleting account removes its transactions)
14. For financial operations, always verify resulting account balances
15. File naming: `feature.e2e-spec.ts`
16. Keep tests deterministic — no random data, fixed dates, predictable amounts
17. Test workspace isolation: use `x-workspace-id` header when testing multi-workspace scenarios
18. Verify `class-transformer` exclusions: sensitive fields (password, tokens) must not appear in responses

## Existing Test Files (references)

| File | Coverage |
|------|----------|
| `app.e2e-spec.ts` | Health check, app info |
| `auth.e2e-spec.ts` | Register, login, verify email, refresh, password reset, Google OAuth |
| `account-types.e2e-spec.ts` | List/get account types (migration-seeded) |
| `accounts.e2e-spec.ts` | CRUD accounts, balance tracking |
| `bills.e2e-spec.ts` | CRUD bills, instances, overrides, payments |
| `budgets.e2e-spec.ts` | CRUD budgets, progress, category uniqueness |
| `categories.e2e-spec.ts` | CRUD categories, parent-child, cascade |
| `transactions.e2e-spec.ts` | CRUD transactions, transfers, balance effects |
| `users.e2e-spec.ts` | Get/update profile, currency |
| `workspaces.e2e-spec.ts` | CRUD workspaces, members, invitations, roles |
| `attachments.e2e-spec.ts` | File upload/download/delete, MIME validation, cascade delete, S3 mock |

## Workflow

1. Read the feature's controller, service, DTOs, and entity to understand endpoints and logic
2. Check 2-3 existing test files for patterns (especially one with similar complexity)
3. Create `budget-api/test/{feature}.e2e-spec.ts` using the template above
4. Run tests: `cd budget-api && npm run test:e2e -- --testPathPattern={feature}`
5. Fix failures and iterate until all tests pass
