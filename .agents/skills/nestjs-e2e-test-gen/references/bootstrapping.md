# Test Environment Bootstrapping Reference

## When to Bootstrap

Bootstrap test infrastructure when ANY of these are missing:
- No `test/` directory (beyond the default NestJS scaffold)
- No test utility helpers (app factory, auth helpers, DB teardown)
- Missing dev dependencies (`@nestjs/testing`, `supertest`, etc.)

## Directory Structure

```
test/
├── jest-e2e.json              — e2e Jest config (or vitest equivalent)
├── app.e2e-spec.ts            — (may already exist from scaffold)
├── <feature>.e2e-spec.ts      — one per controller/module
└── utils/
    ├── test-app.factory.ts    — app bootstrap helper
    ├── auth.helper.ts         — JWT token generation for tests
    └── db.helper.ts           — database seeding and teardown
```

## Test App Factory

Create a reusable app factory that mirrors `main.ts` configuration:

```typescript
// test/utils/test-app.factory.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Mirror main.ts global configuration
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  await app.init();
  return app;
}
```

**Important**: Always replicate global pipes, interceptors, filters, and prefixes from `main.ts`. Without this, validation behavior and response serialization will differ from production.

## Auth Helper

Generate valid JWT tokens for authenticated test requests.

### Approach A — Use the real auth flow

Register a test user, verify, set password, login, and use the returned token. This tests the full auth stack but is slower and couples tests to auth endpoints.

### Approach B — Generate tokens directly (preferred for speed)

```typescript
// test/utils/auth.helper.ts
import { JwtService } from '@nestjs/jwt';
import { INestApplication } from '@nestjs/common';
import { Session } from '../../src/shared/types';

export function getAuthToken(app: INestApplication, session: Partial<Session>): string {
  const jwtService = app.get(JwtService);
  return jwtService.sign({
    authId: session.authId ?? 'test-auth-id',
    userId: session.userId ?? 'test-user-id',
    name: session.name ?? 'Test User',
    email: session.email ?? 'test@example.com',
    currencyCode: session.currencyCode ?? 'USD',
  });
}
```

Adapt based on what the JwtStrategy `validate()` method expects as payload.

## Database Helper

### Mongoose

```typescript
// test/utils/db.helper.ts
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export async function clearDatabase(app: INestApplication): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  const collections = connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function seedData(app: INestApplication, modelName: string, data: any[]): Promise<any[]> {
  const connection = app.get<Connection>(getConnectionToken());
  const model = connection.model(modelName);
  return model.insertMany(data);
}
```

### TypeORM

```typescript
export async function clearDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
}
```

### Prisma

```typescript
export async function clearDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const models = Reflect.ownKeys(prisma).filter(
    (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
  );
  for (const model of models) {
    await prisma[model as string].deleteMany();
  }
}
```

## Test Database Strategy

Options (ask user or detect from config):

1. **Separate test database**: Use a different `MONGODB_URI` (e.g., `.env.test`) pointing to a dedicated test DB
2. **In-memory database**: Use `mongodb-memory-server` for completely isolated, ephemeral tests
3. **Existing database with cleanup**: Use the dev DB but clear collections before/after tests (risky for dev data)

Recommend option 1 or 2. If `mongodb-memory-server` is not installed, note it as a suggested dependency.

## Required Dependencies

Check and install if missing:

```
@nestjs/testing
supertest
@types/supertest
```

Optional but recommended:
```
mongodb-memory-server    — for in-memory Mongoose tests
```

## Jest E2E Config

If `test/jest-e2e.json` already exists, do not overwrite. If missing:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

For Vitest, create `vitest-e2e.config.ts` instead.
