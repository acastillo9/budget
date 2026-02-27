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
} from './utils/db.helper';

describe('BillsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  let accountId: string;
  let categoryId: string;
  let createdBillId: string;
  let initialBalance: number;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const result = await createActiveUser(app, {
      email: 'bills@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    workspaceId = result.workspaceId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });

    const accountTypeId = await getAccountTypeId(app, 'CHECKING');

    initialBalance = 2000;
    accountId = await seedAccount(app, {
      name: 'Bills Account',
      balance: initialBalance,
      currencyCode: 'USD',
      accountType: accountTypeId,
      user: userId,
      workspace: workspaceId,
    });

    categoryId = await seedCategory(app, {
      name: 'Utilities',
      icon: 'bolt',
      categoryType: 'EXPENSE',
      user: userId,
      workspace: workspaceId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /bills
  // ──────────────────────────────────────────────────
  describe('POST /bills', () => {
    it('should create a monthly bill', async () => {
      const response = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Electricity',
          amount: 120,
          dueDate: '2026-01-15T00:00:00.000Z',
          frequency: 'MONTHLY',
          account: accountId,
          category: categoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Electricity',
        amount: 120,
        frequency: 'MONTHLY',
      });
      expect(response.body.id).toBeDefined();
      createdBillId = response.body.id;
    });

    it('should create a one-time bill', async () => {
      const response = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Annual Insurance',
          amount: 800,
          dueDate: '2026-06-01T00:00:00.000Z',
          frequency: 'ONCE',
          account: accountId,
          category: categoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body.frequency).toBe('ONCE');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          dueDate: '2026-01-15T00:00:00.000Z',
          frequency: 'MONTHLY',
          account: accountId,
          category: categoryId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when amount is not positive', async () => {
      const response = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad',
          amount: -10,
          dueDate: '2026-01-15T00:00:00.000Z',
          frequency: 'MONTHLY',
          account: accountId,
          category: categoryId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when frequency is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad Freq',
          amount: 50,
          dueDate: '2026-01-15T00:00:00.000Z',
          frequency: 'HOURLY',
          account: accountId,
          category: categoryId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when account is not a valid MongoId', async () => {
      const response = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad Account',
          amount: 50,
          dueDate: '2026-01-15T00:00:00.000Z',
          frequency: 'MONTHLY',
          account: 'not-a-mongo-id',
          category: categoryId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).post('/bills').send({
        name: 'No Auth',
        amount: 50,
        dueDate: '2026-01-15T00:00:00.000Z',
        frequency: 'MONTHLY',
        account: accountId,
        category: categoryId,
      });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /bills — with date range
  // ──────────────────────────────────────────────────
  describe('GET /bills', () => {
    it('should return bill instances within the date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/bills')
        .query({ dateStart: '2026-01-01', dateEnd: '2026-04-01' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Monthly bill starting Jan 15: instances on Jan 15, Feb 15, Mar 15 = 3
      // Plus the one-time bill on June 1 is outside the range = 0
      const electricityInstances = response.body.filter(
        (b: any) => b.name === 'Electricity',
      );
      expect(electricityInstances.length).toBe(3);
    });

    it('should return 400 when dateStart is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/bills')
        .query({ dateEnd: '2026-04-01' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .get('/bills')
        .query({ dateStart: '2026-01-01', dateEnd: '2026-04-01' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /bills/:id/:targetDate/pay
  // ──────────────────────────────────────────────────
  describe('POST /bills/:id/:targetDate/pay', () => {
    const targetDate = '2026-02-15';

    it('should pay a bill instance and deduct from account balance', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${createdBillId}/${targetDate}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paidDate: '2026-02-15T00:00:00.000Z' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('PAID');

      // Bill amount is 120 → expense transaction → balance decreases
      const balance = await getAccountBalance(app, accountId);
      expect(balance).toBe(initialBalance - 120);
    });

    it('should return 400 when bill is already paid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${createdBillId}/${targetDate}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paidDate: '2026-02-15T00:00:00.000Z' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${nonExistentId()}/${targetDate}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paidDate: '2026-02-15T00:00:00.000Z' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${createdBillId}/${targetDate}/pay`)
        .send({ paidDate: '2026-02-15T00:00:00.000Z' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /bills/:id/:targetDate/unpay
  // ──────────────────────────────────────────────────
  describe('POST /bills/:id/:targetDate/unpay', () => {
    const targetDate = '2026-02-15';

    it('should cancel payment and reverse account balance', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${createdBillId}/${targetDate}/unpay`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.status).not.toBe('PAID');

      // Balance should be back to initial
      const balance = await getAccountBalance(app, accountId);
      expect(balance).toBe(initialBalance);
    });

    it('should return 400 when bill is not paid', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${createdBillId}/${targetDate}/unpay`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bills/${nonExistentId()}/${targetDate}/unpay`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).post(
        `/bills/${createdBillId}/${targetDate}/unpay`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /bills/:id/:targetDate
  // ──────────────────────────────────────────────────
  describe('PATCH /bills/:id/:targetDate', () => {
    const targetDate = '2026-03-15';

    it('should update a bill instance name with applyToFuture', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bills/${createdBillId}/${targetDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Electricity (Updated)', applyToFuture: true });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Electricity (Updated)');
    });

    it('should update a bill instance amount', async () => {
      // applyToFuture must be true; the service crashes with
      // endDate.getTime() when applyToFuture is false and endDate is absent
      const response = await request(app.getHttpServer())
        .patch(`/bills/${createdBillId}/${targetDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 150, applyToFuture: true });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(150);
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bills/${nonExistentId()}/${targetDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ghost', applyToFuture: true });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/bills/${createdBillId}/${targetDate}`)
        .send({ name: 'No Auth', applyToFuture: true });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /bills/:id/:targetDate
  // ──────────────────────────────────────────────────
  describe('DELETE /bills/:id/:targetDate', () => {
    const targetDate = '2026-03-15';

    it('should mark a bill instance as deleted', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/bills/${createdBillId}/${targetDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applyToFuture: false });

      expect(response.status).toBe(200);

      // Verify the instance no longer appears in the list
      const listRes = await request(app.getHttpServer())
        .get('/bills')
        .query({ dateStart: '2026-03-01', dateEnd: '2026-04-01' })
        .set('Authorization', `Bearer ${authToken}`);

      const deletedInstance = listRes.body.find(
        (b: any) => b.targetDate === targetDate,
      );
      expect(deletedInstance).toBeUndefined();
    });

    it('should return 400 when instance is already deleted', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/bills/${createdBillId}/${targetDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applyToFuture: false });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent bill', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/bills/${nonExistentId()}/${targetDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applyToFuture: false });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/bills/${createdBillId}/${targetDate}`)
        .send({ applyToFuture: false });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // applyToFuture — single-instance vs future propagation
  // ──────────────────────────────────────────────────
  describe('applyToFuture behaviour', () => {
    let billId: string;
    // Wide range that covers all 12 monthly instances (Jan–Dec 2026)
    const listRange = { dateStart: '2026-01-01', dateEnd: '2027-01-01' };

    /** Helper: fetch all instances for this bill within the full year range. */
    async function listInstances(): Promise<any[]> {
      const res = await request(app.getHttpServer())
        .get('/bills')
        .query(listRange)
        .set('Authorization', `Bearer ${authToken}`);
      return res.body.filter((b: any) => b.id === billId);
    }

    /** Helper: find a specific instance by its targetDate (YYYY-MM-DD). */
    function findByDate(instances: any[], dateStr: string) {
      return instances.find((i) => i.targetDate.startsWith(dateStr));
    }

    beforeAll(async () => {
      // Create a monthly bill with a known endDate so that
      // applyToFuture: false patches can include the matching endDate/frequency
      // to work around the service's endDate.getTime() null-check bug.
      const res = await request(app.getHttpServer())
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Internet',
          amount: 80,
          dueDate: '2026-01-15T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          frequency: 'MONTHLY',
          account: accountId,
          category: categoryId,
        });
      billId = res.body.id;
    });

    // ── PATCH: single-instance only ─────────────────
    it('should update ONLY the targeted instance when applyToFuture is false', async () => {
      // Patch April 15 only
      const patchRes = await request(app.getHttpServer())
        .patch(`/bills/${billId}/2026-04-15`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Internet (April Special)',
          applyToFuture: false,
          // Must include matching endDate & frequency to avoid service crash
          endDate: '2026-12-31T00:00:00.000Z',
          frequency: 'MONTHLY',
        });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.name).toBe('Internet (April Special)');

      const instances = await listInstances();

      // March keeps the original name
      const mar = findByDate(instances, '2026-03-15');
      expect(mar).toBeDefined();
      expect(mar.name).toBe('Internet');

      // April has the override
      const apr = findByDate(instances, '2026-04-15');
      expect(apr).toBeDefined();
      expect(apr.name).toBe('Internet (April Special)');

      // May is NOT affected (still original)
      const may = findByDate(instances, '2026-05-15');
      expect(may).toBeDefined();
      expect(may.name).toBe('Internet');
    });

    // ── PATCH: propagate to future ──────────────────
    it('should propagate changes to all future instances when applyToFuture is true', async () => {
      // Patch June 15 with applyToFuture → affects Jun, Jul, Aug, Sep, Oct, Nov, Dec
      const patchRes = await request(app.getHttpServer())
        .patch(`/bills/${billId}/2026-06-15`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100, applyToFuture: true });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.amount).toBe(100);

      const instances = await listInstances();

      // Before the pivot: amount unchanged
      const may = findByDate(instances, '2026-05-15');
      expect(may.amount).toBe(80);

      // April still has its single-instance override (name only, amount unchanged)
      const apr = findByDate(instances, '2026-04-15');
      expect(apr.amount).toBe(80);

      // At the pivot and beyond: amount propagated
      expect(findByDate(instances, '2026-06-15').amount).toBe(100);
      expect(findByDate(instances, '2026-07-15').amount).toBe(100);
      expect(findByDate(instances, '2026-08-15').amount).toBe(100);
      expect(findByDate(instances, '2026-09-15').amount).toBe(100);
    });

    // ── DELETE: single-instance only ────────────────
    it('should delete ONLY the targeted instance when applyToFuture is false', async () => {
      // Delete August 15 only
      const delRes = await request(app.getHttpServer())
        .delete(`/bills/${billId}/2026-08-15`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applyToFuture: false });
      expect(delRes.status).toBe(200);

      const instances = await listInstances();

      // July still exists
      expect(findByDate(instances, '2026-07-15')).toBeDefined();

      // August is gone
      expect(findByDate(instances, '2026-08-15')).toBeUndefined();

      // September still exists
      expect(findByDate(instances, '2026-09-15')).toBeDefined();
    });

    // ── DELETE: propagate to future ─────────────────
    it('should delete the targeted instance AND all future instances when applyToFuture is true', async () => {
      // Delete October 15 with applyToFuture
      const delRes = await request(app.getHttpServer())
        .delete(`/bills/${billId}/2026-10-15`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applyToFuture: true });
      expect(delRes.status).toBe(200);

      const instances = await listInstances();

      // September still exists (before the pivot)
      expect(findByDate(instances, '2026-09-15')).toBeDefined();

      // October, November, December are all gone
      expect(findByDate(instances, '2026-10-15')).toBeUndefined();
      expect(findByDate(instances, '2026-11-15')).toBeUndefined();
      expect(findByDate(instances, '2026-12-15')).toBeUndefined();
    });
  });
});
