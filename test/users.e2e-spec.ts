import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import { clearDatabase, createActiveUser } from './utils/db.helper';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const { userId, authProviderId } = await createActiveUser(app, {
      email: 'update-user@example.com',
      password: 'Password123',
      name: 'Original Name',
      currencyCode: 'USD',
    });

    authToken = getAuthToken(app, { authId: authProviderId, userId });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // PATCH /users
  // ──────────────────────────────────────────────────
  describe('PATCH /users', () => {
    it('should update user name', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should update user currencyCode to COP', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currencyCode: 'COP' });

      expect(response.status).toBe(200);
      expect(response.body.currencyCode).toBe('COP');
    });

    it('should update user picture', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ picture: 'https://example.com/avatar.jpg' });

      expect(response.status).toBe(200);
      expect(response.body.picture).toBe('https://example.com/avatar.jpg');
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Multi Update',
          currencyCode: 'USD',
          picture: 'https://example.com/new-avatar.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Multi Update');
      expect(response.body.currencyCode).toBe('USD');
      expect(response.body.picture).toBe(
        'https://example.com/new-avatar.jpg',
      );
    });

    it('should return 400 for invalid currencyCode enum value', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currencyCode: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .send({ name: 'No Auth' });

      expect(response.status).toBe(401);
    });

    it('should return 200 with empty body (all fields optional)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe('update-user@example.com');
    });

    it('should strip unknown properties (whitelist)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Clean User', unknownField: 'should be stripped' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Clean User');
      expect(response.body.unknownField).toBeUndefined();
    });
  });
});
