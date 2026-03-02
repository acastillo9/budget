import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  getAccountBalance,
  getAccountTypeId,
  nonExistentId,
  seedAccount,
  seedCategory,
  seedTransaction,
} from './utils/db.helper';

describe('TransactionsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  // Shared prerequisite IDs
  let accountTypeId: string;
  let checkingAccountId: string;
  let savingsAccountId: string;
  let expenseCategoryId: string;
  let incomeCategoryId: string;

  // Balance tracking
  let expectedCheckingBalance: number;
  let expectedSavingsBalance: number;

  // Track created transaction IDs for later tests
  let expenseTransactionId: string;
  let transferTransactionId: string;

  // Use a date safely in the recent past to stay within the default 30-day query window.
  // Avoids timezone edge cases by using noon, and avoids future-date issues by subtracting days.
  const midMonthDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  })();

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const result = await createActiveUser(app, {
      email: 'transactions@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    workspaceId = result.workspaceId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });

    accountTypeId = await getAccountTypeId(app, 'CHECKING');

    expectedCheckingBalance = 1000;
    checkingAccountId = await seedAccount(app, {
      name: 'Main Checking',
      balance: expectedCheckingBalance,
      currencyCode: 'USD',
      accountType: accountTypeId,
      user: userId,
      workspace: workspaceId,
    });

    expectedSavingsBalance = 500;
    savingsAccountId = await seedAccount(app, {
      name: 'Savings',
      balance: expectedSavingsBalance,
      currencyCode: 'USD',
      accountType: accountTypeId,
      user: userId,
      workspace: workspaceId,
    });

    expenseCategoryId = await seedCategory(app, {
      name: 'Groceries',
      icon: 'cart',
      categoryType: 'EXPENSE',
      user: userId,
      workspace: workspaceId,
    });

    incomeCategoryId = await seedCategory(app, {
      name: 'Salary',
      icon: 'money',
      categoryType: 'INCOME',
      user: userId,
      workspace: workspaceId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /transactions — regular (expense / income)
  // ──────────────────────────────────────────────────
  describe('POST /transactions', () => {
    it('should create an expense and negate the amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          date: midMonthDate,
          description: 'Grocery shopping',
          category: expenseCategoryId,
          account: checkingAccountId,
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(-50);
      expect(response.body.description).toBe('Grocery shopping');
      expect(response.body.id).toBeDefined();
      expenseTransactionId = response.body.id;

      // Verify account balance decreased
      expectedCheckingBalance -= 50;
      const balance = await getAccountBalance(app, checkingAccountId);
      expect(balance).toBe(expectedCheckingBalance);
    });

    it('should create an income and keep positive amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          date: midMonthDate,
          description: 'Monthly salary',
          category: incomeCategoryId,
          account: checkingAccountId,
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(3000);

      // Verify account balance increased
      expectedCheckingBalance += 3000;
      const balance = await getAccountBalance(app, checkingAccountId);
      expect(balance).toBe(expectedCheckingBalance);
    });

    it('should return 400 when amount is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: midMonthDate,
          description: 'No amount',
          category: expenseCategoryId,
          account: checkingAccountId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when category is not a valid MongoId', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10,
          date: midMonthDate,
          description: 'Bad category',
          category: 'not-a-mongo-id',
          account: checkingAccountId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 10,
          date: midMonthDate,
          description: 'No auth',
          category: expenseCategoryId,
          account: checkingAccountId,
        });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /transactions — inline category creation
  // ──────────────────────────────────────────────────
  describe('POST /transactions (inline category)', () => {
    it('should create a transaction with an inline expense category', async () => {
      const balanceBefore = await getAccountBalance(app, checkingAccountId);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 120,
          date: midMonthDate,
          description: 'Electronics purchase',
          newCategory: {
            name: 'Electronics',
            icon: 'laptop',
            categoryType: 'EXPENSE',
          },
          account: checkingAccountId,
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(-120);
      expect(response.body.description).toBe('Electronics purchase');
      expect(response.body.id).toBeDefined();

      // Verify account balance decreased
      expectedCheckingBalance -= 120;
      const balanceAfter = await getAccountBalance(app, checkingAccountId);
      expect(balanceAfter).toBe(balanceBefore - 120);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/transactions/${response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expectedCheckingBalance += 120;
    });

    it('should create a transaction with an inline income category', async () => {
      const balanceBefore = await getAccountBalance(app, checkingAccountId);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          date: midMonthDate,
          description: 'Freelance payment',
          newCategory: {
            name: 'Freelance',
            icon: 'briefcase',
            categoryType: 'INCOME',
          },
          account: checkingAccountId,
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(500);

      // Verify account balance increased
      expectedCheckingBalance += 500;
      const balanceAfter = await getAccountBalance(app, checkingAccountId);
      expect(balanceAfter).toBe(balanceBefore + 500);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/transactions/${response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expectedCheckingBalance -= 500;
    });

    it('should create the inline category and make it retrievable via GET /categories', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 30,
          date: midMonthDate,
          description: 'Subscription payment',
          newCategory: {
            name: 'Subscriptions',
            icon: 'repeat',
            categoryType: 'EXPENSE',
          },
          account: checkingAccountId,
        });

      expect(response.status).toBe(201);
      expectedCheckingBalance -= 30;

      // Verify the newly created category appears in the categories list
      const categoriesResponse = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(categoriesResponse.status).toBe(200);
      const subscriptionsCat = categoriesResponse.body.find(
        (c: any) => c.name === 'Subscriptions',
      );
      expect(subscriptionsCat).toBeDefined();
      expect(subscriptionsCat.icon).toBe('repeat');
      expect(subscriptionsCat.categoryType).toBe('EXPENSE');

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/transactions/${response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      expectedCheckingBalance += 30;
    });

    it('should return 400 when both category and newCategory are provided', async () => {
      const balanceBefore = await getAccountBalance(app, checkingAccountId);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          date: midMonthDate,
          description: 'Both fields',
          category: expenseCategoryId,
          newCategory: {
            name: 'Duplicate',
            icon: 'copy',
            categoryType: 'EXPENSE',
          },
          account: checkingAccountId,
        });

      expect(response.status).toBe(400);

      // Verify balance unchanged
      expect(await getAccountBalance(app, checkingAccountId)).toBe(
        balanceBefore,
      );
    });

    it('should return 400 when neither category nor newCategory is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          date: midMonthDate,
          description: 'No category',
          account: checkingAccountId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when newCategory has invalid categoryType', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          date: midMonthDate,
          description: 'Bad category type',
          newCategory: {
            name: 'Invalid',
            icon: 'x',
            categoryType: 'INVALID_TYPE',
          },
          account: checkingAccountId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when newCategory is missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          date: midMonthDate,
          description: 'Incomplete category',
          newCategory: {
            name: 'Missing icon and type',
          },
          account: checkingAccountId,
        });

      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /transactions/transfer
  // ──────────────────────────────────────────────────
  describe('POST /transactions/transfer', () => {
    it('should create a transfer and adjust both account balances', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200,
          date: midMonthDate,
          description: 'Transfer to savings',
          account: savingsAccountId,
          originAccount: checkingAccountId,
        });

      expect(response.status).toBe(201);
      expect(response.body.isTransfer).toBe(true);
      expect(response.body.amount).toBe(200); // income side returned
      transferTransactionId = response.body.id;

      // Verify both balances
      expectedCheckingBalance -= 200;
      expectedSavingsBalance += 200;
      expect(await getAccountBalance(app, checkingAccountId)).toBe(
        expectedCheckingBalance,
      );
      expect(await getAccountBalance(app, savingsAccountId)).toBe(
        expectedSavingsBalance,
      );
    });

    it('should return 400 when originAccount is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          date: midMonthDate,
          description: 'Missing origin',
          account: savingsAccountId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions/transfer')
        .send({
          amount: 100,
          date: midMonthDate,
          description: 'No auth',
          account: savingsAccountId,
          originAccount: checkingAccountId,
        });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /transactions
  // ──────────────────────────────────────────────────
  describe('GET /transactions', () => {
    it('should return paginated transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');
      expect(Array.isArray(response.body.data)).toBe(true);
      // expense + income + 2 transfer legs = 4
      expect(response.body.total).toBe(4);
    });

    it('should respect limit and offset', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ limit: 2, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.limit).toBe(2);
      expect(response.body.offset).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/transactions');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /transactions — date range filtering
  // ──────────────────────────────────────────────────
  describe('GET /transactions (date range filtering)', () => {
    let dateFilterAccountId: string;
    let dateFilterCategoryId: string;

    beforeAll(async () => {
      // Create a dedicated account and category for date filter tests
      dateFilterAccountId = await seedAccount(app, {
        name: 'Date Filter Account',
        balance: 10000,
        currencyCode: 'USD',
        accountType: accountTypeId,
        user: userId,
        workspace: workspaceId,
      });
      dateFilterCategoryId = await seedCategory(app, {
        name: 'Date Filter Cat',
        icon: 'calendar',
        categoryType: 'EXPENSE',
        user: userId,
        workspace: workspaceId,
      });

      // Seed transactions at known dates (direct DB insert to avoid balance side-effects)
      await seedTransaction(app, {
        amount: -10,
        date: new Date('2025-01-15'),
        description: 'Jan 2025 tx',
        category: dateFilterCategoryId,
        account: dateFilterAccountId,
        user: userId,
        workspace: workspaceId,
      });
      await seedTransaction(app, {
        amount: -20,
        date: new Date('2025-02-10'),
        description: 'Feb 2025 tx',
        category: dateFilterCategoryId,
        account: dateFilterAccountId,
        user: userId,
        workspace: workspaceId,
      });
      await seedTransaction(app, {
        amount: -30,
        date: new Date('2025-03-05'),
        description: 'Mar 2025 tx',
        category: dateFilterCategoryId,
        account: dateFilterAccountId,
        user: userId,
        workspace: workspaceId,
      });
      await seedTransaction(app, {
        amount: -5,
        date: new Date(),
        description: 'Today tx for default range',
        category: dateFilterCategoryId,
        account: dateFilterAccountId,
        user: userId,
        workspace: workspaceId,
      });
    });

    it('should return only transactions within the specified date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-02-01',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Jan 2025 tx');
      expect(descriptions).not.toContain('Feb 2025 tx');
      expect(descriptions).not.toContain('Mar 2025 tx');
    });

    it('should return transactions across multiple months when range spans them', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-04-01',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Jan 2025 tx');
      expect(descriptions).toContain('Feb 2025 tx');
      expect(descriptions).toContain('Mar 2025 tx');
    });

    it('should return empty data when no transactions exist in range', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({
          dateFrom: '2020-01-01',
          dateTo: '2020-02-01',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should treat dateTo as exclusive (upper bound)', async () => {
      // dateTo is the exact date of the Feb transaction — should NOT include it
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({
          dateFrom: '2025-02-10',
          dateTo: '2025-03-05',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Feb 2025 tx');
      expect(descriptions).not.toContain('Mar 2025 tx');
    });

    it('should default to last 30 days when no date params are provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Today tx for default range');
      // Old transactions from 2025 should NOT appear in the default 30-day window
      expect(descriptions).not.toContain('Jan 2025 tx');
    });

    it('should work with only dateFrom provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ dateFrom: '2025-03-01' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Mar 2025 tx');
      expect(descriptions).not.toContain('Jan 2025 tx');
      expect(descriptions).not.toContain('Feb 2025 tx');
    });

    it('should work with only dateTo provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ dateTo: '2025-02-01' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Jan 2025 tx');
      expect(descriptions).not.toContain('Feb 2025 tx');
      expect(descriptions).not.toContain('Mar 2025 tx');
    });

    it('should combine date range with categoryId filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-04-01',
          categoryId: dateFilterCategoryId,
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      // Every returned transaction should belong to the date filter category
      response.body.data.forEach((t: any) => {
        expect(t.category.id).toBe(dateFilterCategoryId);
      });
    });

    it('should sort results by date descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({
          dateFrom: '2025-01-01',
          dateTo: '2025-04-01',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const dates = response.body.data.map((t: any) =>
        new Date(t.date).getTime(),
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
  });

  // ──────────────────────────────────────────────────
  // GET /transactions/summary
  // ──────────────────────────────────────────────────
  describe('GET /transactions/summary', () => {
    it('should return the rolling 30-day summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // We have expense (-50) and income (+3000) in USD for the current month.
      // Transfers are excluded from the summary.
      const usdSummary = response.body.find(
        (s: any) => s.currencyCode === 'USD',
      );
      expect(usdSummary).toBeDefined();
      expect(usdSummary.totalIncome).toBe(3000);
      expect(usdSummary.totalExpenses).toBe(55); // absolute value (50 original + 5 from date-range seed)
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/transactions/summary',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /transactions/:id — amount update with balance check
  // ──────────────────────────────────────────────────
  describe('PATCH /transactions/:id', () => {
    it('should update description', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${expenseTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated grocery shopping' });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated grocery shopping');
    });

    it('should update expense amount and adjust balance', async () => {
      // Current expense is -50, updating to 75 → stored as -75
      // Balance diff: -75 - (-50) = -25
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${expenseTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 75 });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(-75);

      expectedCheckingBalance -= 25; // additional 25 deducted
      expect(await getAccountBalance(app, checkingAccountId)).toBe(
        expectedCheckingBalance,
      );
    });

    it('should return 500 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Ghost' });

      expect(response.status).toBe(500);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/${expenseTransactionId}`)
        .send({ description: 'No auth' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /transactions/:id — with balance reversal
  // ──────────────────────────────────────────────────
  describe('DELETE /transactions/:id', () => {
    it('should delete an expense and reverse the balance', async () => {
      // Current expense stored amount is -75
      // Reversal: -(-75) = +75
      const response = await request(app.getHttpServer())
        .delete(`/transactions/${expenseTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(expenseTransactionId);

      expectedCheckingBalance += 75;
      expect(await getAccountBalance(app, checkingAccountId)).toBe(
        expectedCheckingBalance,
      );
    });

    it('should return 500 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/transactions/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/transactions/${nonExistentId()}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /transactions/transfer/:id
  // ──────────────────────────────────────────────────
  describe('PATCH /transactions/transfer/:id', () => {
    it('should update transfer description on both legs', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/transfer/${transferTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated transfer' });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated transfer');
    });

    it('should update transfer amount and adjust both balances', async () => {
      // Current transfer amount is 200.
      // Updating to 300 → income side: 300, outcome side: -300
      // Checking (outcome): old = -200, new = -300, diff = -100
      // Savings (income): old = 200, new = 300, diff = +100
      const response = await request(app.getHttpServer())
        .patch(`/transactions/transfer/${transferTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 300 });

      expect(response.status).toBe(200);

      expectedCheckingBalance -= 100;
      expectedSavingsBalance += 100;
      expect(await getAccountBalance(app, checkingAccountId)).toBe(
        expectedCheckingBalance,
      );
      expect(await getAccountBalance(app, savingsAccountId)).toBe(
        expectedSavingsBalance,
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/transactions/transfer/${transferTransactionId}`)
        .send({ description: 'No auth' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /transactions/transfer/:id
  // ──────────────────────────────────────────────────
  describe('DELETE /transactions/transfer/:id', () => {
    it('should delete both transfer legs and reverse both balances', async () => {
      // Transfer amount is now 300 (after update).
      // Income side (savings): +300 → reversal: -300
      // Outcome side (checking): -300 → reversal: +300
      const response = await request(app.getHttpServer())
        .delete(`/transactions/transfer/${transferTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      expectedCheckingBalance += 300;
      expectedSavingsBalance -= 300;
      expect(await getAccountBalance(app, checkingAccountId)).toBe(
        expectedCheckingBalance,
      );
      expect(await getAccountBalance(app, savingsAccountId)).toBe(
        expectedSavingsBalance,
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/transactions/transfer/${nonExistentId()}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /transactions?categoryId= — subcategory expansion
  // ──────────────────────────────────────────────────
  describe('GET /transactions?categoryId (subcategory filter)', () => {
    let parentCatId: string;
    let subCatId: string;

    beforeAll(async () => {
      // Create parent + subcategory
      parentCatId = await seedCategory(app, {
        name: 'Shopping',
        icon: 'bag',
        categoryType: 'EXPENSE',
        user: userId,
        workspace: workspaceId,
      });
      subCatId = await seedCategory(app, {
        name: 'Online Shopping',
        icon: 'globe',
        categoryType: 'EXPENSE',
        user: userId,
        workspace: workspaceId,
        parent: parentCatId,
      });

      // Create transactions: one on parent, one on subcategory
      const createTx = (categoryId: string, description: string) =>
        request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 25,
            date: midMonthDate,
            description,
            category: categoryId,
            account: checkingAccountId,
          });

      await createTx(parentCatId, 'Parent category purchase');
      expectedCheckingBalance -= 25;
      await createTx(subCatId, 'Subcategory purchase');
      expectedCheckingBalance -= 25;
    });

    it('should return transactions from both parent and subcategories when filtering by parent categoryId', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ categoryId: parentCatId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Parent category purchase');
      expect(descriptions).toContain('Subcategory purchase');
    });

    it('should return only subcategory transactions when filtering by subcategory categoryId', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions')
        .query({ categoryId: subCatId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      const descriptions = response.body.data.map((t: any) => t.description);
      expect(descriptions).toContain('Subcategory purchase');
      expect(descriptions).not.toContain('Parent category purchase');
    });
  });

  // ──────────────────────────────────────────────────
  // Account balance integrity — isolated scenarios
  // ──────────────────────────────────────────────────
  describe('Account balance integrity', () => {
    let isolatedAccountId: string;
    let secondAccountId: string;
    const ISO_BALANCE = 5000;
    const SEC_BALANCE = 2000;

    beforeAll(async () => {
      isolatedAccountId = await seedAccount(app, {
        name: 'Isolated Balance',
        balance: ISO_BALANCE,
        currencyCode: 'USD',
        accountType: accountTypeId,
        user: userId,
        workspace: workspaceId,
      });
      secondAccountId = await seedAccount(app, {
        name: 'Second Balance',
        balance: SEC_BALANCE,
        currencyCode: 'USD',
        accountType: accountTypeId,
        user: userId,
        workspace: workspaceId,
      });
    });

    it('should not change balance on a failed create (validation error)', async () => {
      const before = await getAccountBalance(app, isolatedAccountId);

      // Missing amount → 400
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: midMonthDate,
          description: 'Should fail',
          category: expenseCategoryId,
          account: isolatedAccountId,
        });

      expect(await getAccountBalance(app, isolatedAccountId)).toBe(before);
    });

    it('should not change balance when updating only description', async () => {
      const before = await getAccountBalance(app, isolatedAccountId);

      // Create an expense
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          date: midMonthDate,
          description: 'Desc-only update test',
          category: expenseCategoryId,
          account: isolatedAccountId,
        });
      const txId = createRes.body.id;
      const afterCreate = await getAccountBalance(app, isolatedAccountId);
      expect(afterCreate).toBe(before - 100);

      // Update only description — balance must stay the same
      const updateRes = await request(app.getHttpServer())
        .patch(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Changed description' });

      expect(updateRes.status).toBe(200);
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(afterCreate);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should correctly reverse balance when deleting an income transaction', async () => {
      const before = await getAccountBalance(app, isolatedAccountId);

      // Create income (+500)
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          date: midMonthDate,
          description: 'Income delete test',
          category: incomeCategoryId,
          account: isolatedAccountId,
        });
      expect(createRes.status).toBe(201);
      const txId = createRes.body.id;
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(
        before + 500,
      );

      // Delete → reversal: -(+500) = -500
      const deleteRes = await request(app.getHttpServer())
        .delete(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleteRes.status).toBe(200);

      expect(await getAccountBalance(app, isolatedAccountId)).toBe(before);
    });

    it('should move balance between accounts when changing the account field', async () => {
      const isoBefore = await getAccountBalance(app, isolatedAccountId);
      const secBefore = await getAccountBalance(app, secondAccountId);

      // Create an expense (-150) on the isolated account
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 150,
          date: midMonthDate,
          description: 'Account move test',
          category: expenseCategoryId,
          account: isolatedAccountId,
        });
      expect(createRes.status).toBe(201);
      const txId = createRes.body.id;
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(
        isoBefore - 150,
      );

      // Move to second account
      const moveRes = await request(app.getHttpServer())
        .patch(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ account: secondAccountId });
      expect(moveRes.status).toBe(200);

      // Isolated: reversed (-(-150) = +150) → back to isoBefore
      // Second: receives old amount (-150) → secBefore - 150
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(isoBefore);
      expect(await getAccountBalance(app, secondAccountId)).toBe(
        secBefore - 150,
      );

      // Cleanup: delete from second account
      await request(app.getHttpServer())
        .delete(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(await getAccountBalance(app, secondAccountId)).toBe(secBefore);
    });

    it('should flip amount sign and adjust balance when changing category from expense to income', async () => {
      const before = await getAccountBalance(app, isolatedAccountId);

      // Create an expense (-200)
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 200,
          date: midMonthDate,
          description: 'Category flip test',
          category: expenseCategoryId,
          account: isolatedAccountId,
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.amount).toBe(-200);
      const txId = createRes.body.id;
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(
        before - 200,
      );

      // Change category from EXPENSE to INCOME (no amount field sent)
      // Service flips sign: -200 → +200, amountDiff = 200 - (-200) = +400
      const updateRes = await request(app.getHttpServer())
        .patch(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ category: incomeCategoryId });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.amount).toBe(200);

      expect(await getAccountBalance(app, isolatedAccountId)).toBe(
        before + 200,
      );

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(before);
    });

    it('should handle category change with new amount simultaneously', async () => {
      const before = await getAccountBalance(app, isolatedAccountId);

      // Create an expense (-300)
      const createRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 300,
          date: midMonthDate,
          description: 'Category + amount test',
          category: expenseCategoryId,
          account: isolatedAccountId,
        });
      expect(createRes.status).toBe(201);
      const txId = createRes.body.id;
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(
        before - 300,
      );

      // Change to INCOME category AND set new amount to 400
      // Service: new category is INCOME → stored amount = +400
      // amountDiff = 400 - (-300) = +700
      const updateRes = await request(app.getHttpServer())
        .patch(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ category: incomeCategoryId, amount: 400 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.amount).toBe(400);

      expect(await getAccountBalance(app, isolatedAccountId)).toBe(
        before + 400,
      );

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(await getAccountBalance(app, isolatedAccountId)).toBe(before);
    });
  });
});
