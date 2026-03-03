---
name: nestjs-e2e-test-gen
description: >
  Generate end-to-end tests for NestJS APIs using supertest. Analyzes controllers, DTOs,
  guards, and entities to produce a structured test plan (mandatory user review), then
  generates .e2e-spec.ts files with full coverage: happy paths, validation errors,
  auth scenarios, edge cases, and relationship tests. Bootstraps test infrastructure
  (test utilities, auth helpers, DB helpers) when missing. Detects ORM (Mongoose, TypeORM,
  Prisma, MikroORM, Drizzle), auth strategy (JWT, Passport), and test runner (Jest, Vitest).
  Triggers: "generate e2e tests", "create end-to-end tests", "write integration tests",
  "test my NestJS API", "set up e2e testing", "I need e2e tests for these controllers",
  or references to supertest / @nestjs/testing in test generation context.
  Supports incremental generation (skips already-covered endpoints) and monorepos.
---

# NestJS E2E Test Generator

Generate comprehensive e2e tests for NestJS APIs. Uses supertest, follows AAA pattern.

## Workflow Overview

This skill operates in 4 mandatory sequential steps:

1. **Analyze** — Scan codebase to map API surface, detect ORM/auth/test runner
2. **Plan** — Generate test plan document, present to user for approval (**mandatory — never skip**)
3. **Bootstrap** — Set up test utilities if missing (app factory, auth helper, DB helper)
4. **Implement** — Generate `.e2e-spec.ts` files for approved test cases

## Step 1 — Analyze

Read [references/analysis.md](references/analysis.md) for detailed detection strategies.

### Quick checklist

1. Read `package.json` → detect ORM, test runner, installed test deps
2. Read `main.ts` → note global pipes, interceptors, filters, prefix
3. Glob `**/*.controller.ts` → map all endpoints (method, path, guards, DTOs, params)
4. Glob `**/*.dto.ts` → extract validation rules per DTO
5. Glob `**/*.entity.ts` → build entity dependency graph for seeding order
6. Check auth setup → find global guards, passport strategies, `@Public()` usage
7. Glob `**/*.e2e-spec.ts` → identify already-covered endpoints to avoid duplicates

Produce an internal API surface map: each endpoint with its method, path, auth requirements, request DTO, and response shape.

## Step 2 — Plan

**This step is mandatory. Never skip to code generation.**

Read [references/test-plan.md](references/test-plan.md) for the plan template and test case categories.

Generate a Markdown test plan covering for each endpoint:
- Happy path scenarios
- Validation/error scenarios (one per validation rule in the DTO)
- Auth scenarios (401 without token, if guards detected)
- Not found scenarios (for `:id` endpoints)
- Edge cases (empty payloads, boundaries, duplicates)
- Relationship scenarios (resources depending on other resources)

Present the plan to the user. Wait for approval before proceeding. The user may:
- Approve as-is → continue to Step 3
- Request additions or removals → revise plan and re-present
- Ask to generate tests for a subset → scope accordingly

## Step 3 — Bootstrap

Read [references/bootstrapping.md](references/bootstrapping.md) for setup patterns per ORM and auth strategy.

Check and create if missing:

| File | Purpose | Skip if exists |
|---|---|---|
| `test/utils/test-app.factory.ts` | App bootstrap mirroring `main.ts` config | Yes |
| `test/utils/auth.helper.ts` | JWT token generation for test requests | Yes |
| `test/utils/db.helper.ts` | Database clear/seed utilities | Yes |
| `test/jest-e2e.json` | E2E Jest config | Yes |

Install missing dev dependencies (`@nestjs/testing`, `supertest`, `@types/supertest`).

**Critical**: The test app factory must replicate all global middleware from `main.ts` (ValidationPipe with same options, ClassSerializerInterceptor, global prefix, etc.) to match production behavior.

## Step 4 — Implement

Read [references/test-patterns.md](references/test-patterns.md) for code patterns, AAA structure, assertion examples, and test data guidelines.

### Rules

- One `.e2e-spec.ts` file per controller or logical module
- Place files in `test/` directory alongside existing e2e tests
- **Never overwrite** existing test files without explicit user confirmation
- Follow AAA pattern: Arrange → Act → Assert
- Use BDD-style describe/it naming: `describe('POST /accounts')` → `it('should create an account with valid data')`
- Use realistic test data (not `'string'` or `123`)
- Seed dependency data in `beforeAll`, clean up in `afterAll`
- Test data isolation: each suite self-contained, no cross-suite dependencies
- All authenticated requests use `set('Authorization', \`Bearer ${authToken}\`)`

### File template

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import { clearDatabase } from './utils/db.helper';

describe('FeatureController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    authToken = getAuthToken(app, { userId: '...', email: '...' });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  describe('POST /feature', () => {
    it('should create with valid data', async () => {
      // Arrange
      const dto = { /* realistic data */ };
      // Act
      const res = await request(app.getHttpServer())
        .post('/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);
      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ /* expected shape */ });
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .post('/feature')
        .send({});
      expect(res.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
```

## Edge Cases

- **Monorepo**: Detect `nest-cli.json` with `projects` key; scope tests to the target project
- **No auth**: If no guards detected, skip auth test cases
- **Partial coverage**: If some e2e tests exist, only generate for uncovered endpoints
- **Complex endpoints** (transfers, bill payments): Test the side effects (linked resources, balance updates)
- **File uploads**: If `@UseInterceptors(FileInterceptor)` detected, use `.attach()` in supertest
- **Paginated responses**: Test with and without pagination params
- **Query filters**: Test each query parameter combination
