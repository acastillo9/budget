import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  nonExistentId,
  seedAccount,
  seedAccountType,
  seedBudget,
  seedCategory,
  seedTransaction,
} from './utils/db.helper';

describe('BudgetsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  // Prerequisite IDs
  let expenseCategoryId1: string;
  let expenseCategoryId2: string;
  let incomeCategoryId: string;
  let accountId: string;

  // Tracked IDs from test flow
  let createdBudgetId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    // Seed user
    const result = await createActiveUser(app, {
      email: 'budgets@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });

    // Seed categories
    expenseCategoryId1 = await seedCategory(app, {
      name: 'Groceries',
      icon: 'cart',
      categoryType: 'EXPENSE',
      user: userId,
    });
    expenseCategoryId2 = await seedCategory(app, {
      name: 'Restaurants',
      icon: 'utensils',
      categoryType: 'EXPENSE',
      user: userId,
    });
    incomeCategoryId = await seedCategory(app, {
      name: 'Salary',
      icon: 'briefcase',
      categoryType: 'INCOME',
      user: userId,
    });

    // Seed account (needed for transaction seeding)
    const accountTypeId = await seedAccountType(app, {
      name: 'Checking',
      accountCategory: 'ASSET',
    });
    accountId = await seedAccount(app, {
      name: 'Main Checking',
      balance: 5000,
      currencyCode: 'USD',
      accountType: accountTypeId,
      user: userId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /budgets
  // ──────────────────────────────────────────────────
  describe('POST /budgets', () => {
    it('should create a budget with required fields', async () => {
      const dto = {
        amount: 500,
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: [expenseCategoryId1],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        amount: 500,
        period: 'MONTHLY',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0].id).toBe(expenseCategoryId1);

      createdBudgetId = response.body.id;
    });

    it('should create a budget with optional name and endDate', async () => {
      const dto = {
        name: 'Dining Out Budget',
        amount: 200,
        period: 'WEEKLY',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T00:00:00.000Z',
        categories: [expenseCategoryId2],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Dining Out Budget');
      expect(response.body.endDate).toBeDefined();
      expect(response.body.period).toBe('WEEKLY');
    });

    it('should return 400 when amount is missing', async () => {
      const dto = {
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: [expenseCategoryId1],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when amount is negative', async () => {
      const dto = {
        amount: -100,
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: [incomeCategoryId],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when period is invalid', async () => {
      const dto = {
        amount: 300,
        period: 'DAILY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: [incomeCategoryId],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when startDate is missing', async () => {
      const dto = {
        amount: 300,
        period: 'MONTHLY',
        categories: [incomeCategoryId],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when categories is an empty array', async () => {
      const dto = {
        amount: 300,
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: [],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when categories contains an invalid ID', async () => {
      const dto = {
        amount: 300,
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: ['not-a-valid-mongo-id'],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when categories is missing', async () => {
      const dto = {
        amount: 300,
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 400 when a category is already assigned to another budget with the same period', async () => {
      // expenseCategoryId1 was already used in the first MONTHLY budget
      const dto = {
        amount: 1000,
        period: 'MONTHLY',
        startDate: '2025-02-01T00:00:00.000Z',
        categories: [expenseCategoryId1],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto);

      expect(response.status).toBe(400);
    });

    it('should return 401 when no auth token is provided', async () => {
      const dto = {
        amount: 500,
        period: 'MONTHLY',
        startDate: '2025-01-01T00:00:00.000Z',
        categories: [expenseCategoryId1],
      };

      const response = await request(app.getHttpServer())
        .post('/budgets')
        .send(dto);

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /budgets
  // ──────────────────────────────────────────────────
  describe('GET /budgets', () => {
    it('should return all budgets for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/budgets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/budgets');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /budgets/:id
  // ──────────────────────────────────────────────────
  describe('GET /budgets/:id', () => {
    it('should return a budget by id with populated categories', async () => {
      const response = await request(app.getHttpServer())
        .get(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdBudgetId);
      expect(response.body.amount).toBe(500);
      expect(response.body.period).toBe('MONTHLY');
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0]).toMatchObject({
        id: expenseCategoryId1,
        name: 'Groceries',
      });
    });

    it('should return 404 for a non-existent budget id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/budgets/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).get(
        `/budgets/${createdBudgetId}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /budgets/:id/progress
  // ──────────────────────────────────────────────────
  describe('GET /budgets/:id/progress', () => {
    let progressBudgetId: string;

    beforeAll(async () => {
      // Create a dedicated budget for progress tests
      progressBudgetId = await seedBudget(app, {
        name: 'Groceries Progress Test',
        amount: 400,
        period: 'MONTHLY',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        categories: [incomeCategoryId],
        user: userId,
      });

      // Seed expense transactions for January 2024
      await seedTransaction(app, {
        amount: -75.5,
        date: new Date('2024-01-05T00:00:00.000Z'),
        description: 'Weekly groceries',
        category: incomeCategoryId,
        account: accountId,
        user: userId,
      });
      await seedTransaction(app, {
        amount: -124.5,
        date: new Date('2024-01-20T00:00:00.000Z'),
        description: 'Bulk groceries',
        category: incomeCategoryId,
        account: accountId,
        user: userId,
      });

      // Seed expense transaction for February 2024
      await seedTransaction(app, {
        amount: -50,
        date: new Date('2024-02-10T00:00:00.000Z'),
        description: 'Quick groceries',
        category: incomeCategoryId,
        account: accountId,
        user: userId,
      });
    });

    it('should return progress for the current period without query params', async () => {
      const response = await request(app.getHttpServer())
        .get(`/budgets/${progressBudgetId}/progress`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const window = response.body[0];
      expect(window.budgetId).toBe(progressBudgetId);
      expect(window.amount).toBe(400);
      expect(window.period).toBe('MONTHLY');
      expect(window.periodStart).toBeDefined();
      expect(window.periodEnd).toBeDefined();
      expect(typeof window.spent).toBe('number');
      expect(typeof window.remaining).toBe('number');
      expect(typeof window.percentUsed).toBe('number');
    });

    it('should return multiple progress windows for a date range', async () => {
      const response = await request(app.getHttpServer())
        .get(`/budgets/${progressBudgetId}/progress`)
        .query({
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-03-01T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2); // Jan and Feb windows

      // January window: 75.50 + 124.50 = 200 spent
      const janWindow = response.body[0];
      expect(janWindow.spent).toBe(200);
      expect(janWindow.remaining).toBe(200); // 400 - 200
      expect(janWindow.percentUsed).toBe(50);

      // February window: 50 spent
      const febWindow = response.body[1];
      expect(febWindow.spent).toBe(50);
      expect(febWindow.remaining).toBe(350); // 400 - 50
      expect(febWindow.percentUsed).toBe(12.5);
    });

    it('should return spent 0 when no transactions match the budget categories', async () => {
      // Create a budget on a category with no transactions (WEEKLY to avoid MONTHLY conflicts)
      const emptyBudgetId = await seedBudget(app, {
        name: 'Empty Budget',
        amount: 100,
        period: 'WEEKLY',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        categories: [expenseCategoryId2],
        user: userId,
      });

      const response = await request(app.getHttpServer())
        .get(`/budgets/${emptyBudgetId}/progress`)
        .query({
          from: '2024-01-01T00:00:00.000Z',
          to: '2024-01-08T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].spent).toBe(0);
      expect(response.body[0].remaining).toBe(100);
      expect(response.body[0].percentUsed).toBe(0);
    });

    it('should return 404 for a non-existent budget id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/budgets/${nonExistentId()}/progress`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).get(
        `/budgets/${progressBudgetId}/progress`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /budgets/:id
  // ──────────────────────────────────────────────────
  describe('PATCH /budgets/:id', () => {
    it('should update the budget amount', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 750 });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(750);
      expect(response.body.id).toBe(createdBudgetId);
    });

    it('should update the budget name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Groceries Budget' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Groceries Budget');
    });

    it('should update the budget categories', async () => {
      // Switch from expenseCategoryId1 to both expense categories
      // First, we need a budget that allows this without uniqueness conflicts.
      // createdBudgetId currently uses expenseCategoryId1 with MONTHLY period.
      // expenseCategoryId2 has a WEEKLY budget, so adding it to a MONTHLY budget is fine.
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categories: [expenseCategoryId1, expenseCategoryId2] });

      expect(response.status).toBe(200);
      expect(response.body.categories).toHaveLength(2);
    });

    it('should return 400 when amount is negative', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -50 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when period is invalid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ period: 'BIWEEKLY' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when updating categories causes a uniqueness conflict', async () => {
      // incomeCategoryId is used by the progress test budget with MONTHLY period.
      // Try to set createdBudgetId (also MONTHLY) to use incomeCategoryId.
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categories: [incomeCategoryId] });

      expect(response.status).toBe(400);
    });

    it('should return 404 for a non-existent budget id', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 999 });

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budgets/${createdBudgetId}`)
        .send({ amount: 999 });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /budgets/:id
  // ──────────────────────────────────────────────────
  describe('DELETE /budgets/:id', () => {
    it('should delete an existing budget and return it', async () => {
      // Create a budget specifically for deletion
      const createResponse = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Be Deleted',
          amount: 100,
          period: 'YEARLY',
          startDate: '2025-01-01T00:00:00.000Z',
          categories: [incomeCategoryId],
        });
      const budgetToDeleteId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/budgets/${budgetToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(budgetToDeleteId);
      expect(response.body.name).toBe('To Be Deleted');

      // Verify it no longer exists
      const getResponse = await request(app.getHttpServer())
        .get(`/budgets/${budgetToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for a non-existent budget id', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/budgets/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/budgets/${createdBudgetId}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
