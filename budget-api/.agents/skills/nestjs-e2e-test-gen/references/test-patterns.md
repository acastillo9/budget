# E2E Test Code Patterns

## File Structure

One `.e2e-spec.ts` file per controller or logical module:

```
test/
├── accounts.e2e-spec.ts
├── auth.e2e-spec.ts
├── bills.e2e-spec.ts
├── categories.e2e-spec.ts
├── transactions.e2e-spec.ts
└── ...
```

## Test File Skeleton

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import { clearDatabase, seedData } from './utils/db.helper';

describe('FeatureController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    authToken = getAuthToken(app, { userId: '...', email: '...' });
    // Seed prerequisite data
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  describe('POST /feature', () => {
    it('should create a resource with valid data', async () => {
      // Arrange
      const dto = { name: 'Test Resource', ... };

      // Act
      const response = await request(app.getHttpServer())
        .post('/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Test Resource',
        ...
      });
    });
  });
});
```

## AAA Pattern (Arrange-Act-Assert)

Every test should follow this structure:

```typescript
it('should [expected behavior]', async () => {
  // Arrange — set up test data and preconditions
  const createDto = { name: 'Groceries', icon: 'cart', categoryType: 'EXPENSE' };

  // Act — perform the action under test
  const response = await request(app.getHttpServer())
    .post('/categories')
    .set('Authorization', `Bearer ${authToken}`)
    .send(createDto);

  // Assert — verify the result
  expect(response.status).toBe(201);
  expect(response.body.name).toBe('Groceries');
  expect(response.body.id).toBeDefined();
});
```

## Common Assertion Patterns

### Status code + body shape
```typescript
expect(response.status).toBe(200);
expect(response.body).toMatchObject({ name: 'Expected' });
```

### Array response
```typescript
expect(response.status).toBe(200);
expect(Array.isArray(response.body)).toBe(true);
expect(response.body).toHaveLength(2);
```

### Validation error (400)
```typescript
const response = await request(app.getHttpServer())
  .post('/accounts')
  .set('Authorization', `Bearer ${authToken}`)
  .send({});

expect(response.status).toBe(400);
```

### Unauthorized (401)
```typescript
const response = await request(app.getHttpServer())
  .get('/accounts');
  // No Authorization header

expect(response.status).toBe(401);
```

### Not found (404)
```typescript
const response = await request(app.getHttpServer())
  .get('/accounts/507f1f77bcf86cd799439011')
  .set('Authorization', `Bearer ${authToken}`);

expect(response.status).toBe(404);
```

## Test Data Guidelines

Use realistic, context-aware test data — not generic "string" or 123:

| Field Type | Good Example | Bad Example |
|---|---|---|
| Name | `'Monthly Groceries'` | `'string'` |
| Email | `'alice@example.com'` | `'test'` |
| Amount | `150.75` | `123` |
| Date | `'2025-03-15T00:00:00.000Z'` | `'date'` |
| MongoId | `new Types.ObjectId().toString()` | `'id'` |
| Enum | `'EXPENSE'` (actual enum value) | `'type'` |
| Currency | `'USD'` | `'XXX'` |

## Test Isolation

Each test must be independent. Strategies:

### Option A — Seed + clear per suite
```typescript
beforeAll(() => { /* seed shared data */ });
afterAll(() => { /* clear all data */ });
```

### Option B — Seed + clear per test
```typescript
beforeEach(() => { /* seed data */ });
afterEach(() => { /* clear data */ });
```

Option A is faster. Option B is safer for full isolation. Default to Option A unless tests interfere with each other.

## Handling Resource Dependencies

When a resource depends on another (e.g., Account depends on AccountType and User):

```typescript
let accountTypeId: string;
let userId: string;

beforeAll(async () => {
  // Seed dependencies first
  const [accountType] = await seedData(app, 'AccountType', [
    { name: 'Checking', accountCategory: 'ASSET' },
  ]);
  accountTypeId = accountType._id.toString();

  const [user] = await seedData(app, 'User', [
    { name: 'Test User', email: 'test@example.com', currencyCode: 'USD' },
  ]);
  userId = user._id.toString();
});
```

## Transfer / Linked Resource Testing

For endpoints that create linked resources (e.g., transfer creates two transactions):

```typescript
it('should create two linked transactions for a transfer', async () => {
  const response = await request(app.getHttpServer())
    .post('/transactions/transfer')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ fromAccountId, toAccountId, amount: 100, date: '2025-03-15' });

  expect(response.status).toBe(201);

  // Verify both transactions exist
  const listResponse = await request(app.getHttpServer())
    .get('/transactions')
    .set('Authorization', `Bearer ${authToken}`);

  const transfers = listResponse.body.filter((t: any) => t.isTransfer);
  expect(transfers).toHaveLength(2);
});
```

## Monorepo Handling

For NestJS workspaces:
1. Detect `nest-cli.json` with `projects` key
2. Each project may have its own `test/` directory
3. Generate tests scoped to the target project
4. Use the project's `tsconfig` for path resolution
