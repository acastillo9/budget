import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  nonExistentId,
  seedAccountType,
  seedCategory,
} from './utils/db.helper';

describe('AccountsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let checkingTypeId: string;
  let savingsTypeId: string;
  let creditCardTypeId: string;
  let expenseCategoryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const result = await createActiveUser(app, {
      email: 'accounts@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });

    // Seed reference data
    checkingTypeId = await seedAccountType(app, {
      name: 'Checking',
      accountCategory: 'ASSET',
    });
    savingsTypeId = await seedAccountType(app, {
      name: 'Savings',
      accountCategory: 'ASSET',
    });
    creditCardTypeId = await seedAccountType(app, {
      name: 'Credit Card',
      accountCategory: 'LIABILITY',
    });

    // Seed a category for cascade delete test
    expenseCategoryId = await seedCategory(app, {
      name: 'Groceries',
      icon: 'cart',
      categoryType: 'EXPENSE',
      user: userId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /accounts
  // ──────────────────────────────────────────────────
  describe('POST /accounts', () => {
    let createdAccountId: string;

    it('should create an account with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Main Checking',
          currencyCode: 'USD',
          balance: 1500,
          accountType: checkingTypeId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Main Checking',
        currencyCode: 'USD',
        balance: 1500,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.accountType).toHaveProperty('id', checkingTypeId);
      createdAccountId = response.body.id;
    });

    it('should create a second account with different type', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Savings Account',
          currencyCode: 'USD',
          balance: 5000,
          accountType: savingsTypeId,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Savings Account');
    });

    it('should create a credit card account (liability)', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Visa Card',
          currencyCode: 'USD',
          balance: -200,
          accountType: creditCardTypeId,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Visa Card');
      expect(response.body.balance).toBe(-200);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currencyCode: 'USD',
          balance: 0,
          accountType: checkingTypeId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when currencyCode is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad Currency',
          currencyCode: 'INVALID',
          balance: 0,
          accountType: checkingTypeId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when accountType is not a valid MongoId', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad Type',
          currencyCode: 'USD',
          balance: 0,
          accountType: 'not-a-mongo-id',
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          name: 'No Auth',
          currencyCode: 'USD',
          balance: 0,
          accountType: checkingTypeId,
        });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /accounts
  // ──────────────────────────────────────────────────
  describe('GET /accounts', () => {
    it('should return all accounts for the user', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3); // checking + savings + credit card
    });

    it('should respect the limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should not return accounts from another user', async () => {
      const otherUser = await createActiveUser(app, {
        email: 'other-acct@example.com',
        password: 'Password123',
      });
      const otherToken = getAuthToken(app, {
        authId: otherUser.authProviderId,
        userId: otherUser.userId,
      });

      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/accounts');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /accounts/summary
  // ──────────────────────────────────────────────────
  describe('GET /accounts/summary', () => {
    it('should return account summary grouped by currency and category', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      // The $project stage flattens currencyCode and accountCategory to top level
      const assetSummary = response.body.find(
        (s: any) =>
          s.currencyCode === 'USD' && s.accountCategory === 'ASSET',
      );
      expect(assetSummary).toBeDefined();
      expect(assetSummary.totalBalance).toBe(6500); // 1500 + 5000
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/accounts/summary',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /accounts/:id
  // ──────────────────────────────────────────────────
  describe('PATCH /accounts/:id', () => {
    let accountToUpdateId: string;

    beforeAll(async () => {
      // Get the first account from the list to update
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${authToken}`);
      accountToUpdateId = response.body[0].id;
    });

    it('should update account name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/accounts/${accountToUpdateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Checking' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Checking');
    });

    it('should return 400 when currencyCode is invalid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/accounts/${accountToUpdateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currencyCode: 'INVALID' });

      expect(response.status).toBe(400);
    });

    it('should return 500 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/accounts/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost' });

      expect(response.status).toBe(500);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/accounts/${accountToUpdateId}`)
        .send({ name: 'No Auth' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /accounts/:id — with cascade verification
  // ──────────────────────────────────────────────────
  describe('DELETE /accounts/:id', () => {
    let accountToDeleteId: string;

    beforeAll(async () => {
      // Create a dedicated account for deletion
      const accRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Delete',
          currencyCode: 'USD',
          balance: 200,
          accountType: checkingTypeId,
        });
      accountToDeleteId = accRes.body.id;

      // Create a transaction linked to this account
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 20,
          date: '2026-01-15T00:00:00.000Z',
          description: 'Test expense for cascade',
          category: expenseCategoryId,
          account: accountToDeleteId,
        });
    });

    it('should delete account and cascade-remove its transactions', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/accounts/${accountToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(accountToDeleteId);

      // Verify the transaction linked to this account is also gone
      const txRes = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      const linkedTx = txRes.body.data.filter(
        (t: any) => t.account?.id === accountToDeleteId,
      );
      expect(linkedTx).toHaveLength(0);
    });

    it('should return 404 for non-existent id', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/accounts/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/accounts/${nonExistentId()}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
