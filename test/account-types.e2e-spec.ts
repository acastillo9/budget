import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import { clearDatabase, createActiveUser } from './utils/db.helper';

describe('AccountTypesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const { userId, authProviderId } = await createActiveUser(app, {
      email: 'acctypes@example.com',
      password: 'Password123',
    });
    authToken = getAuthToken(app, { authId: authProviderId, userId });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  describe('GET /account-types', () => {
    it('should return all account types from migration', async () => {
      const response = await request(app.getHttpServer())
        .get('/account-types')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(7);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('accountCategory');

      const names = response.body.map((t: any) => t.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'CHECKING',
          'SAVINGS',
          'CREDIT_CARD',
          'LOAN',
          'INVESTMENT',
          'MORTGAGE',
          'CASH',
        ]),
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/account-types');

      expect(response.status).toBe(401);
    });
  });
});
