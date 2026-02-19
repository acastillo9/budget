import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  nonExistentId,
  seedCategory,
} from './utils/db.helper';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let createdCategoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const result = await createActiveUser(app, {
      email: 'categories@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /categories
  // ──────────────────────────────────────────────────
  describe('POST /categories', () => {
    it('should create a category with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Groceries', icon: 'cart', categoryType: 'EXPENSE' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Groceries',
        icon: 'cart',
        categoryType: 'EXPENSE',
      });
      expect(response.body.id).toBeDefined();
      createdCategoryId = response.body.id;
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ icon: 'cart', categoryType: 'EXPENSE' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when icon is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Food', categoryType: 'EXPENSE' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when categoryType is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Bad', icon: 'x', categoryType: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'No Auth', icon: 'x', categoryType: 'EXPENSE' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /categories
  // ──────────────────────────────────────────────────
  describe('GET /categories', () => {
    it('should return categories for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should not return categories from another user', async () => {
      // Create a second user with their own category
      const user2 = await createActiveUser(app, {
        email: 'other-user@example.com',
        password: 'Password123',
      });
      await seedCategory(app, {
        name: 'Other User Category',
        icon: 'star',
        categoryType: 'INCOME',
        user: user2.userId,
      });

      // First user should NOT see the second user's category
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${authToken}`);

      const names = response.body.map((c: any) => c.name);
      expect(names).not.toContain('Other User Category');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/categories');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /categories/:id
  // ──────────────────────────────────────────────────
  describe('GET /categories/:id', () => {
    it('should return a category by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdCategoryId);
      expect(response.body.name).toBe('Groceries');
    });

    it('should return 500 for non-existent id', async () => {
      // Service pattern catches HttpException(404) and re-throws as 500
      const response = await request(app.getHttpServer())
        .get(`/categories/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        `/categories/${createdCategoryId}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /categories/:id
  // ──────────────────────────────────────────────────
  describe('PATCH /categories/:id', () => {
    it('should update a category name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Food & Drinks' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Food & Drinks');
    });

    it('should return 400 when categoryType is invalid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryType: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('should return 500 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost' });

      expect(response.status).toBe(500);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${createdCategoryId}`)
        .send({ name: 'No Auth' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /categories/:id
  // ──────────────────────────────────────────────────
  describe('DELETE /categories/:id', () => {
    let categoryToDeleteId: string;

    beforeAll(async () => {
      categoryToDeleteId = await seedCategory(app, {
        name: 'To Delete',
        icon: 'trash',
        categoryType: 'EXPENSE',
        user: userId,
      });
    });

    it('should delete a category and return it', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${categoryToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(categoryToDeleteId);
    });

    it('should return 500 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/categories/${nonExistentId()}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
