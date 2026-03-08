import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  nonExistentId,
} from './utils/db.helper';
import { NotificationType } from 'src/notifications/entities/notification-type.enum';

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  // User A (primary test user)
  let authTokenA: string;
  let userIdA: string;
  let workspaceIdA: string;

  // User B (for data isolation tests)
  let authTokenB: string;
  let userIdB: string;
  let workspaceIdB: string;

  // Tracked notification IDs
  let notificationId1: string;
  let notificationId2: string;
  let notificationId3: string;

  /**
   * Seed a Notification document directly in the database.
   * Uses the Mongoose model registered by NotificationsModule.
   */
  async function seedNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    user: string;
    workspace: string;
    isRead?: boolean;
    readAt?: Date;
    data?: Record<string, any>;
    actionUrl?: string;
  }): Promise<string> {
    const Model = connection.model('Notification');
    const doc = await Model.create({
      type: data.type,
      title: data.title,
      message: data.message,
      user: data.user,
      workspace: data.workspace,
      isRead: data.isRead ?? false,
      readAt: data.readAt,
      data: data.data,
      actionUrl: data.actionUrl,
    });
    return (doc as any)._id.toString();
  }

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get<Connection>(getConnectionToken());
    await clearDatabase(app);

    // Seed User A
    const resultA = await createActiveUser(app, {
      email: 'notifications-a@example.com',
      password: 'Password123',
    });
    userIdA = resultA.userId;
    workspaceIdA = resultA.workspaceId;
    authTokenA = getAuthToken(app, {
      authId: resultA.authProviderId,
      userId: userIdA,
    });

    // Seed User B
    const resultB = await createActiveUser(app, {
      email: 'notifications-b@example.com',
      password: 'Password123',
    });
    userIdB = resultB.userId;
    workspaceIdB = resultB.workspaceId;
    authTokenB = getAuthToken(app, {
      authId: resultB.authProviderId,
      userId: userIdB,
    });

    // Seed notifications for User A
    notificationId1 = await seedNotification({
      type: NotificationType.BILL_OVERDUE,
      title: 'Bill Overdue',
      message: 'Your electricity bill is overdue',
      user: userIdA,
      workspace: workspaceIdA,
      actionUrl: '/bills',
      data: { billId: nonExistentId() },
    });

    notificationId2 = await seedNotification({
      type: NotificationType.BUDGET_THRESHOLD,
      title: 'Budget Threshold Reached',
      message: 'Your groceries budget is at 85%',
      user: userIdA,
      workspace: workspaceIdA,
      isRead: true,
      readAt: new Date(),
      actionUrl: '/budgets',
    });

    notificationId3 = await seedNotification({
      type: NotificationType.LARGE_TRANSACTION,
      title: 'Large Transaction',
      message: 'A transaction of $1000 was recorded',
      user: userIdA,
      workspace: workspaceIdA,
      data: { amount: 1000, deduplicationKey: 'large_tx_abc' },
    });

    // Seed a notification for User B (for isolation tests)
    await seedNotification({
      type: NotificationType.LOW_BALANCE,
      title: 'Low Balance',
      message: 'Your savings account balance is low',
      user: userIdB,
      workspace: workspaceIdB,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // GET /notifications
  // ──────────────────────────────────────────────────
  describe('GET /notifications', () => {
    it('should return paginated notifications for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.limit).toBeDefined();
      expect(response.body.offset).toBe(0);
    });

    it('should return notifications sorted by createdAt descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      const dates = response.body.data.map((n: any) =>
        new Date(n.createdAt).getTime(),
      );
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('should filter by notification type', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ type: NotificationType.BILL_OVERDUE })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe(NotificationType.BILL_OVERDUE);
    });

    it('should filter by isRead status (unread)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ isRead: 'false' })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      response.body.data.forEach((n: any) => {
        expect(n.isRead).toBe(false);
      });
    });

    it('should filter by isRead status (read)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ isRead: 'true' })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].isRead).toBe(true);
    });

    it('should paginate with limit and offset', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ limit: 2, offset: 0 })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.limit).toBe(2);
      expect(response.body.offset).toBe(0);
      expect(response.body.nextPage).toBe(2);
    });

    it('should return nextPage as null when all results fit in one page', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.nextPage).toBeNull();
    });

    it('should return second page of results', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ limit: 2, offset: 2 })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(3);
      expect(response.body.nextPage).toBeNull();
    });

    it('should not return notifications from other users (data isolation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(response.status).toBe(200);
      // User B should only see their own notification
      expect(response.body.total).toBe(1);
      expect(response.body.data[0].title).toBe('Low Balance');
      const titles = response.body.data.map((n: any) => n.title);
      expect(titles).not.toContain('Bill Overdue');
      expect(titles).not.toContain('Budget Threshold Reached');
      expect(titles).not.toContain('Large Transaction');
    });

    it('should return 400 for invalid notification type', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ type: 'INVALID_TYPE' })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/notifications');

      expect(response.status).toBe(401);
    });

    it('should expose only expected fields (class-transformer exclusion)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      const notification = response.body.data[0];
      expect(notification.id).toBeDefined();
      expect(notification.type).toBeDefined();
      expect(notification.title).toBeDefined();
      expect(notification.message).toBeDefined();
      expect(notification.isRead).toBeDefined();
      expect(notification.createdAt).toBeDefined();
      // Internal fields should not be exposed
      expect(notification._id).toBeUndefined();
      expect(notification.__v).toBeUndefined();
      expect(notification.user).toBeUndefined();
      expect(notification.workspace).toBeUndefined();
      expect(notification.updatedAt).toBeUndefined();
    });

    it('should handle large pagination offset beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ offset: 9999 })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(3);
      expect(response.body.nextPage).toBeNull();
    });

    it('should handle limit of 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.nextPage).toBe(1);
    });

    it('should handle combined type and isRead filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ type: NotificationType.BILL_OVERDUE, isRead: 'false' })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      response.body.data.forEach((n: any) => {
        expect(n.type).toBe(NotificationType.BILL_OVERDUE);
        expect(n.isRead).toBe(false);
      });
    });

    it('should return 400 when limit exceeds maximum (100)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ limit: 101 })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /notifications/unread-count
  // ──────────────────────────────────────────────────
  describe('GET /notifications/unread-count', () => {
    it('should return the count of unread notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBe(2); // notificationId1 and notificationId3 are unread
    });

    it('should return count for user with one unread notification', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).get(
        '/notifications/unread-count',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /notifications/:id/read
  // ──────────────────────────────────────────────────
  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId1}/read`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(notificationId1);
      expect(response.body.isRead).toBe(true);
      expect(response.body.readAt).toBeDefined();
    });

    it('should be idempotent — marking an already-read notification as read again succeeds', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId1}/read`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.isRead).toBe(true);
    });

    it('should return 404 for a non-existent notification id', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/notifications/${nonExistentId()}/read`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when trying to mark another user notification as read (ownership check)', async () => {
      // User B tries to mark User A's notification as read
      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId3}/read`)
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).patch(
        `/notifications/${notificationId1}/read`,
      );

      expect(response.status).toBe(401);
    });

    it('should verify unread count decreased after marking as read', async () => {
      // notificationId1 was marked read above; only notificationId3 remains unread
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /notifications/read-all
  // ──────────────────────────────────────────────────
  describe('PATCH /notifications/read-all', () => {
    it('should mark all unread notifications as read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('modifiedCount');
      expect(response.body.modifiedCount).toBe(1); // Only notificationId3 was unread
    });

    it('should return modifiedCount 0 when all notifications are already read', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(0);
    });

    it('should verify all notifications are now read', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });

    it('should not affect other users notifications', async () => {
      // User B should still have 1 unread notification
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).patch(
        '/notifications/read-all',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /notifications/:id
  // ──────────────────────────────────────────────────
  describe('DELETE /notifications/:id', () => {
    let notificationToDeleteId: string;

    beforeAll(async () => {
      // Create a notification specifically for deletion
      notificationToDeleteId = await seedNotification({
        type: NotificationType.WORKSPACE_INVITATION,
        title: 'Workspace Invitation',
        message: 'You have been invited to a workspace',
        user: userIdA,
        workspace: workspaceIdA,
      });
    });

    it('should delete a notification and return it', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/notifications/${notificationToDeleteId}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(notificationToDeleteId);
      expect(response.body.title).toBe('Workspace Invitation');
      expect(response.body.type).toBe(NotificationType.WORKSPACE_INVITATION);
    });

    it('should verify the deleted notification no longer appears in list', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      const ids = response.body.data.map((n: any) => n.id);
      expect(ids).not.toContain(notificationToDeleteId);
    });

    it('should return 404 for a non-existent notification id', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/notifications/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when trying to delete an already-deleted notification', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/notifications/${notificationToDeleteId}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when trying to delete another user notification (ownership check)', async () => {
      // User B tries to delete User A's notification
      const response = await request(app.getHttpServer())
        .delete(`/notifications/${notificationId2}`)
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/notifications/${notificationId1}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /notifications/preferences
  // ──────────────────────────────────────────────────
  describe('GET /notifications/preferences', () => {
    it('should auto-create default preferences when none exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();

      // Verify default threshold values
      expect(response.body.budgetThresholdPercent).toBe(80);
      expect(response.body.largeTransactionAmounts).toEqual({
        USD: 500,
        COP: 2000000,
      });
      expect(response.body.lowBalanceAmounts).toEqual({
        USD: 100,
        COP: 500000,
      });
      expect(response.body.billDueSoonDays).toBe(3);

      // Verify default quiet hours
      expect(response.body.quietHoursEnabled).toBe(false);
      expect(response.body.quietHoursStart).toBe('22:00');
      expect(response.body.quietHoursEnd).toBe('08:00');
      expect(response.body.quietHoursTimezone).toBe('UTC');

      // Verify channels exist
      expect(response.body.channels).toBeDefined();
    });

    it('should return the same preferences on subsequent calls (idempotent upsert)', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`);

      const response2 = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response1.body.id).toBe(response2.body.id);
    });

    it('should not expose internal fields (class-transformer exclusion)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBeUndefined();
      expect(response.body.__v).toBeUndefined();
      expect(response.body.user).toBeUndefined();
      expect(response.body.workspace).toBeUndefined();
    });

    it('should create separate preferences per user', async () => {
      const responseA = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`);

      const responseB = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(responseA.status).toBe(200);
      expect(responseB.status).toBe(200);
      expect(responseA.body.id).not.toBe(responseB.body.id);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer()).get(
        '/notifications/preferences',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PUT /notifications/preferences
  // ──────────────────────────────────────────────────
  describe('PUT /notifications/preferences', () => {
    it('should update threshold values', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          budgetThresholdPercent: 90,
          largeTransactionAmounts: { USD: 1000, COP: 3000000 },
          lowBalanceAmounts: { USD: 50, COP: 200000 },
          billDueSoonDays: 7,
        });

      expect(response.status).toBe(200);
      expect(response.body.budgetThresholdPercent).toBe(90);
      expect(response.body.largeTransactionAmounts.USD).toBe(1000);
      expect(response.body.largeTransactionAmounts.COP).toBe(3000000);
      expect(response.body.lowBalanceAmounts.USD).toBe(50);
      expect(response.body.lowBalanceAmounts.COP).toBe(200000);
      expect(response.body.billDueSoonDays).toBe(7);
    });

    it('should update channel preferences with deep merge', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          channels: {
            BILL_OVERDUE: { inApp: true, email: false },
            BUDGET_THRESHOLD: { inApp: false, email: true },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.channels.BILL_OVERDUE.inApp).toBe(true);
      expect(response.body.channels.BILL_OVERDUE.email).toBe(false);
      expect(response.body.channels.BUDGET_THRESHOLD.inApp).toBe(false);
      expect(response.body.channels.BUDGET_THRESHOLD.email).toBe(true);
    });

    it('should update quiet hours settings', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          quietHoursEnabled: true,
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          quietHoursTimezone: 'America/New_York',
        });

      expect(response.status).toBe(200);
      expect(response.body.quietHoursEnabled).toBe(true);
      expect(response.body.quietHoursStart).toBe('23:00');
      expect(response.body.quietHoursEnd).toBe('07:00');
      expect(response.body.quietHoursTimezone).toBe('America/New_York');
    });

    it('should preserve existing values when doing a partial update', async () => {
      // First set specific values
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          budgetThresholdPercent: 75,
          largeTransactionAmounts: { USD: 2000 },
        });

      // Now update only one field
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          budgetThresholdPercent: 60,
        });

      expect(response.status).toBe(200);
      expect(response.body.budgetThresholdPercent).toBe(60);
      // largeTransactionAmounts.USD should still be 2000
      expect(response.body.largeTransactionAmounts.USD).toBe(2000);
    });

    it('should return 400 when budgetThresholdPercent is below minimum (1)', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ budgetThresholdPercent: 0 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when budgetThresholdPercent is above maximum (100)', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ budgetThresholdPercent: 101 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when largeTransactionAmounts has negative value', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ largeTransactionAmounts: { USD: -100 } });

      expect(response.status).toBe(400);
    });

    it('should return 400 when lowBalanceAmounts has negative value', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ lowBalanceAmounts: { USD: -50 } });

      expect(response.status).toBe(400);
    });

    it('should return 400 when largeTransactionAmounts has invalid currency key', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ largeTransactionAmounts: { INVALID: 100 } });

      expect(response.status).toBe(400);
    });

    it('should return 400 when billDueSoonDays is below minimum (1)', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ billDueSoonDays: 0 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when billDueSoonDays is above maximum (30)', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ billDueSoonDays: 31 });

      expect(response.status).toBe(400);
    });

    it('should return 400 when quietHoursStart has invalid format', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ quietHoursStart: '9:00' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when quietHoursEnd has non-matching format', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ quietHoursEnd: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when budgetThresholdPercent is not a number', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ budgetThresholdPercent: 'abc' });

      expect(response.status).toBe(400);
    });

    it('should accept valid empty body (no changes)', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('should not affect other user preferences', async () => {
      // User A updates preferences
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({ budgetThresholdPercent: 55 });

      // User B should still have defaults
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenB}`);

      expect(response.status).toBe(200);
      expect(response.body.budgetThresholdPercent).toBe(80);
    });

    it('should return 401 when no auth token is provided', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .send({ budgetThresholdPercent: 50 });

      expect(response.status).toBe(401);
    });

    it('should strip unknown properties (whitelist validation)', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authTokenA}`)
        .send({
          budgetThresholdPercent: 70,
          unknownField: 'should be stripped',
          anotherUnknown: 999,
        });

      expect(response.status).toBe(200);
      expect(response.body.budgetThresholdPercent).toBe(70);
      expect(response.body.unknownField).toBeUndefined();
      expect(response.body.anotherUnknown).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────
  // Combined business logic scenarios
  // ──────────────────────────────────────────────────
  describe('Business logic scenarios', () => {
    it('should mark as read, verify in list, then delete', async () => {
      // Seed a fresh notification for this test
      const freshId = await seedNotification({
        type: NotificationType.BILL_DUE_SOON,
        title: 'Bill Due Soon',
        message: 'Your internet bill is due in 2 days',
        user: userIdA,
        workspace: workspaceIdA,
        actionUrl: '/bills',
        data: { billId: nonExistentId(), daysUntilDue: 2 },
      });

      // Step 1: Mark as read
      const markResponse = await request(app.getHttpServer())
        .patch(`/notifications/${freshId}/read`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(markResponse.status).toBe(200);
      expect(markResponse.body.isRead).toBe(true);
      expect(markResponse.body.readAt).toBeDefined();

      // Step 2: Verify it shows up as read in the list
      const listResponse = await request(app.getHttpServer())
        .get('/notifications')
        .query({ isRead: 'true' })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(listResponse.status).toBe(200);
      const readIds = listResponse.body.data.map((n: any) => n.id);
      expect(readIds).toContain(freshId);

      // Step 3: Delete
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/notifications/${freshId}`)
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(deleteResponse.status).toBe(200);

      // Step 4: Verify it is gone
      const afterDeleteResponse = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenA}`);

      const allIds = afterDeleteResponse.body.data.map((n: any) => n.id);
      expect(allIds).not.toContain(freshId);
    });

    it('should handle marking all as read and then verify count is 0', async () => {
      // Seed multiple unread notifications
      await seedNotification({
        type: NotificationType.BUDGET_EXCEEDED,
        title: 'Budget Exceeded',
        message: 'Your dining budget has been exceeded',
        user: userIdA,
        workspace: workspaceIdA,
      });
      await seedNotification({
        type: NotificationType.RECURRING_BILL_ENDING,
        title: 'Recurring Bill Ending',
        message: 'Your gym membership is ending soon',
        user: userIdA,
        workspace: workspaceIdA,
      });

      // Verify there are unread notifications
      const countBefore = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(countBefore.body.count).toBeGreaterThan(0);

      // Mark all as read
      const markAllResponse = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(markAllResponse.status).toBe(200);
      expect(markAllResponse.body.modifiedCount).toBeGreaterThan(0);

      // Verify count is 0
      const countAfter = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(countAfter.body.count).toBe(0);
    });

    it('should handle notifications with optional data field', async () => {
      // Seed notification without data
      const noDataId = await seedNotification({
        type: NotificationType.MONTHLY_SUMMARY,
        title: 'Monthly Summary',
        message: 'Your February summary is ready',
        user: userIdA,
        workspace: workspaceIdA,
      });

      // Fetch and verify it works with null/undefined data
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .query({ type: NotificationType.MONTHLY_SUMMARY })
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      const notification = response.body.data.find(
        (n: any) => n.id === noDataId,
      );
      expect(notification).toBeDefined();
      expect(notification.title).toBe('Monthly Summary');
    });

    it('should handle notifications with actionUrl', async () => {
      const actionNotifId = await seedNotification({
        type: NotificationType.LOW_BALANCE,
        title: 'Low Balance Alert',
        message: 'Your checking account is low',
        user: userIdA,
        workspace: workspaceIdA,
        actionUrl: '/accounts',
      });

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authTokenA}`);

      expect(response.status).toBe(200);
      const notification = response.body.data.find(
        (n: any) => n.id === actionNotifId,
      );
      expect(notification).toBeDefined();
      expect(notification.actionUrl).toBe('/accounts');
    });
  });
});
