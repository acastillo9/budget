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

    it('should return 404 for non-existent id', async () => {
      // Service pattern catches HttpException(404) and re-throws as 500
      const response = await request(app.getHttpServer())
        .get(`/categories/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
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

    it('should return 404 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost' });

      expect(response.status).toBe(404);
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

    it('should return 404 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/categories/${nonExistentId()}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // Parent / Subcategory — POST /categories
  // ──────────────────────────────────────────────────
  describe('POST /categories (subcategory)', () => {
    let parentCategoryId: string;

    beforeAll(async () => {
      parentCategoryId = await seedCategory(app, {
        name: 'Food & Dining',
        icon: 'utensils',
        categoryType: 'EXPENSE',
        user: userId,
      });
    });

    it('should create a subcategory that inherits categoryType from parent', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Fast Food', icon: 'burger', parent: parentCategoryId });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Fast Food');
      expect(response.body.categoryType).toBe('EXPENSE');
      expect(response.body.parent).toBeDefined();
      expect(response.body.parent.id).toBe(parentCategoryId);
    });

    it('should create a subcategory without explicit categoryType', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Coffee Shops',
          icon: 'coffee',
          parent: parentCategoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body.categoryType).toBe('EXPENSE');
    });

    it('should return 400 when parent is a subcategory (no 2-level nesting)', async () => {
      // First create a subcategory
      const subRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Sub Level 1', icon: 'level', parent: parentCategoryId });
      expect(subRes.status).toBe(201);

      // Try to nest under the subcategory
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Sub Level 2', icon: 'level', parent: subRes.body.id });

      expect(response.status).toBe(400);
    });

    it('should return 400 when parent does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Orphan', icon: 'ghost', parent: nonExistentId() });

      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /categories/tree
  // ──────────────────────────────────────────────────
  describe('GET /categories/tree', () => {
    it('should return top-level categories with nested children', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories/tree')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Find the 'Food & Dining' parent
      const foodParent = response.body.find(
        (c: any) => c.name === 'Food & Dining',
      );
      expect(foodParent).toBeDefined();
      expect(Array.isArray(foodParent.children)).toBe(true);
      expect(foodParent.children.length).toBeGreaterThanOrEqual(1);

      // Subcategories should NOT appear as top-level entries
      const topLevelNames = response.body.map((c: any) => c.name);
      expect(topLevelNames).not.toContain('Fast Food');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/categories/tree',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /categories/:id/subcategories
  // ──────────────────────────────────────────────────
  describe('GET /categories/:id/subcategories', () => {
    let parentWithChildrenId: string;
    let parentWithoutChildrenId: string;

    beforeAll(async () => {
      parentWithChildrenId = await seedCategory(app, {
        name: 'Transportation',
        icon: 'car',
        categoryType: 'EXPENSE',
        user: userId,
      });
      await seedCategory(app, {
        name: 'Gas',
        icon: 'fuel',
        categoryType: 'EXPENSE',
        user: userId,
        parent: parentWithChildrenId,
      });
      await seedCategory(app, {
        name: 'Parking',
        icon: 'parking',
        categoryType: 'EXPENSE',
        user: userId,
        parent: parentWithChildrenId,
      });

      parentWithoutChildrenId = await seedCategory(app, {
        name: 'Entertainment',
        icon: 'film',
        categoryType: 'EXPENSE',
        user: userId,
      });
    });

    it('should return subcategories of a parent', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${parentWithChildrenId}/subcategories`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      const names = response.body.map((c: any) => c.name);
      expect(names).toContain('Gas');
      expect(names).toContain('Parking');
    });

    it('should return empty array for a category with no children', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${parentWithoutChildrenId}/subcategories`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        `/categories/${parentWithChildrenId}/subcategories`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /categories/:id — parent hierarchy rules
  // ──────────────────────────────────────────────────
  describe('PATCH /categories/:id (parent hierarchy)', () => {
    let topLevelId: string;
    let anotherTopLevelId: string;
    let subCategoryId: string;
    let parentWithKidsId: string;
    let childOfParentId: string;

    beforeAll(async () => {
      topLevelId = await seedCategory(app, {
        name: 'Clothing',
        icon: 'shirt',
        categoryType: 'EXPENSE',
        user: userId,
      });
      anotherTopLevelId = await seedCategory(app, {
        name: 'Health',
        icon: 'heart',
        categoryType: 'INCOME',
        user: userId,
      });
      subCategoryId = await seedCategory(app, {
        name: 'Shoes',
        icon: 'shoe',
        categoryType: 'EXPENSE',
        user: userId,
        parent: topLevelId,
      });
      parentWithKidsId = await seedCategory(app, {
        name: 'Housing',
        icon: 'home',
        categoryType: 'EXPENSE',
        user: userId,
      });
      childOfParentId = await seedCategory(app, {
        name: 'Rent',
        icon: 'key',
        categoryType: 'EXPENSE',
        user: userId,
        parent: parentWithKidsId,
      });
    });

    it('should set a parent on a top-level category and inherit categoryType', async () => {
      // anotherTopLevelId (INCOME) becomes child of topLevelId (EXPENSE)
      // → should inherit EXPENSE
      const response = await request(app.getHttpServer())
        .patch(`/categories/${anotherTopLevelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parent: topLevelId });

      expect(response.status).toBe(200);
      expect(response.body.categoryType).toBe('EXPENSE');
      expect(response.body.parent.id).toBe(topLevelId);
    });

    it('should return 400 when setting parent to a subcategory (depth limit)', async () => {
      const freshId = await seedCategory(app, {
        name: 'Fresh',
        icon: 'leaf',
        categoryType: 'EXPENSE',
        user: userId,
      });

      const response = await request(app.getHttpServer())
        .patch(`/categories/${freshId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parent: subCategoryId });

      expect(response.status).toBe(400);
    });

    it('should return 400 when setting parent on a category that has children', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${parentWithKidsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parent: topLevelId });

      expect(response.status).toBe(400);
    });

    it('should cascade categoryType change from parent to children', async () => {
      // Change parentWithKidsId from EXPENSE to INCOME
      const updateRes = await request(app.getHttpServer())
        .patch(`/categories/${parentWithKidsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryType: 'INCOME' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.categoryType).toBe('INCOME');

      // Verify child inherited the change
      const childRes = await request(app.getHttpServer())
        .get(`/categories/${childOfParentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(childRes.status).toBe(200);
      expect(childRes.body.categoryType).toBe('INCOME');
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /categories/:id — parent with children
  // ──────────────────────────────────────────────────
  describe('DELETE /categories/:id (parent with children)', () => {
    let parentId: string;

    beforeAll(async () => {
      parentId = await seedCategory(app, {
        name: 'Utilities',
        icon: 'bolt',
        categoryType: 'EXPENSE',
        user: userId,
      });
      await seedCategory(app, {
        name: 'Electricity',
        icon: 'zap',
        categoryType: 'EXPENSE',
        user: userId,
        parent: parentId,
      });
    });

    it('should return 400 when deleting a category that has subcategories', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${parentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });
});
