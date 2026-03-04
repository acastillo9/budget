import {
  INestApplication,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { S3Service } from '../src/attachments/s3.service';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  getAccountTypeId,
  nonExistentId,
  seedAccount,
  seedCategory,
  seedTransaction,
} from './utils/db.helper';

// ──────────────────────────────────────────────────
// Mock S3Service to avoid real AWS calls
// ──────────────────────────────────────────────────
class MockS3Service {
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    void buffer;
    void mimeType;
    return key;
  }

  async delete(key: string): Promise<void> {
    void key;
    // no-op
  }

  async getPresignedUrl(key: string, expiresIn?: number): Promise<string> {
    void expiresIn;
    return `https://test-bucket.s3.amazonaws.com/${key}?signed=true`;
  }
}

async function createTestAppWithMockedS3(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(S3Service)
    .useClass(MockS3Service)
    .compile();

  const app = moduleFixture.createNestApplication();
  // Mirror main.ts / test-app.factory.ts global configuration
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.init();
  return app;
}

/**
 * Seed an Attachment document directly in the database.
 */
async function seedAttachment(
  app: INestApplication,
  data: {
    filename: string;
    s3Key: string;
    mimeType: string;
    size: number;
    transaction: string;
    user: string;
    workspace: string;
  },
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Attachment');
  const doc = await Model.create(data);
  return doc._id.toString();
}

/**
 * Count attachment documents for a given transaction.
 */
async function countAttachments(
  app: INestApplication,
  transactionId: string,
): Promise<number> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Attachment');
  return Model.countDocuments({ transaction: transactionId });
}

describe('AttachmentsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let workspaceId: string;

  // Second user for isolation tests
  let secondUserToken: string;
  let secondUserId: string;
  let secondWorkspaceId: string;

  // Shared prerequisite IDs
  let accountTypeId: string;
  let accountId: string;
  let categoryId: string;
  let transactionId: string;

  // A pre-seeded attachment ID for GET/DELETE tests
  let seededAttachmentId: string;

  const midMonthDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    d.setHours(12, 0, 0, 0);
    return d;
  })();

  beforeAll(async () => {
    app = await createTestAppWithMockedS3();
    await clearDatabase(app);

    // Primary user (OWNER)
    const result = await createActiveUser(app, {
      email: 'attachments@example.com',
      password: 'Password123',
    });
    userId = result.userId;
    workspaceId = result.workspaceId;
    authToken = getAuthToken(app, {
      authId: result.authProviderId,
      userId,
    });

    // Second user for data isolation tests
    const secondResult = await createActiveUser(app, {
      email: 'attachments-second@example.com',
      password: 'Password123',
    });
    secondUserId = secondResult.userId;
    secondWorkspaceId = secondResult.workspaceId;
    secondUserToken = getAuthToken(app, {
      authId: secondResult.authProviderId,
      userId: secondUserId,
    });

    // Seed prerequisites
    accountTypeId = await getAccountTypeId(app, 'CHECKING');
    accountId = await seedAccount(app, {
      name: 'Attachment Test Account',
      balance: 1000,
      currencyCode: 'USD',
      accountType: accountTypeId,
      user: userId,
      workspace: workspaceId,
    });

    categoryId = await seedCategory(app, {
      name: 'Attachment Test Category',
      icon: 'receipt',
      categoryType: 'EXPENSE',
      user: userId,
      workspace: workspaceId,
    });

    transactionId = await seedTransaction(app, {
      amount: -50,
      date: midMonthDate,
      description: 'Test transaction for attachments',
      category: categoryId,
      account: accountId,
      user: userId,
      workspace: workspaceId,
    });

    // Pre-seed an attachment for GET/DELETE tests so they don't depend on POST tests
    seededAttachmentId = await seedAttachment(app, {
      filename: 'seeded-receipt.jpg',
      s3Key: `workspaces/${workspaceId}/transactions/${transactionId}/seeded.jpg`,
      mimeType: 'image/jpeg',
      size: 2048,
      transaction: transactionId,
      user: userId,
      workspace: workspaceId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /transactions/:transactionId/attachments
  // ──────────────────────────────────────────────────
  describe('POST /transactions/:transactionId/attachments', () => {
    it('should upload a valid JPEG attachment', async () => {
      const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', fakeJpeg, {
          filename: 'receipt.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.filename).toBe('receipt.jpg');
      expect(response.body.mimeType).toBe('image/jpeg');
      expect(response.body.size).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should upload a valid PNG attachment', async () => {
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', fakePng, {
          filename: 'receipt.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(201);
      expect(response.body.filename).toBe('receipt.png');
      expect(response.body.mimeType).toBe('image/png');
    });

    it('should upload a valid PDF attachment', async () => {
      const fakePdf = Buffer.from('%PDF-1.4 test content');

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', fakePdf, {
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(201);
      expect(response.body.filename).toBe('invoice.pdf');
      expect(response.body.mimeType).toBe('application/pdf');
    });

    it('should upload a valid WebP attachment', async () => {
      const fakeWebp = Buffer.from('RIFF\x00\x00\x00\x00WEBP');

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', fakeWebp, {
          filename: 'photo.webp',
          contentType: 'image/webp',
        });

      expect(response.status).toBe(201);
      expect(response.body.filename).toBe('photo.webp');
      expect(response.body.mimeType).toBe('image/webp');
    });

    it('should reject unsupported file type (text/plain)', async () => {
      const textFile = Buffer.from('Hello, world!');

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', textFile, {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
    });

    it('should reject unsupported file type (application/zip)', async () => {
      const zipFile = Buffer.from('PK\x03\x04 fake zip');

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', zipFile, {
          filename: 'archive.zip',
          contentType: 'application/zip',
        });

      expect(response.status).toBe(400);
    });

    it('should enforce max 5 attachments per transaction', async () => {
      // We have 1 seeded + 4 uploaded = 5 already. The 6th should fail.
      const fakeFile = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', fakeFile, {
          filename: 'sixth.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Maximum of 5');
    });

    it('should return 401 without auth token', async () => {
      const fakeFile = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .attach('file', fakeFile, {
          filename: 'receipt.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(401);
    });

    it('should handle request without file field', async () => {
      const response = await request(app.getHttpServer())
        .post(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({});

      // Should get 400 because no file provided
      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /transactions/:transactionId/attachments
  // ──────────────────────────────────────────────────
  describe('GET /transactions/:transactionId/attachments', () => {
    it('should list all attachments for a transaction', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(5);

      // Verify shape of each attachment
      for (const attachment of response.body) {
        expect(attachment).toHaveProperty('id');
        expect(attachment).toHaveProperty('filename');
        expect(attachment).toHaveProperty('mimeType');
        expect(attachment).toHaveProperty('size');
        expect(attachment).toHaveProperty('createdAt');
        expect(attachment).toHaveProperty('updatedAt');
      }
    });

    it('should return empty array for transaction with no attachments', async () => {
      const newTxId = await seedTransaction(app, {
        amount: -25,
        date: midMonthDate,
        description: 'No attachments tx',
        category: categoryId,
        account: accountId,
        user: userId,
        workspace: workspaceId,
      });

      const response = await request(app.getHttpServer())
        .get(`/transactions/${newTxId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return empty array for non-existent transaction', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${nonExistentId()}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        `/transactions/${transactionId}/attachments`,
      );

      expect(response.status).toBe(401);
    });

    it('should not return attachments from another workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/attachments`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .set('x-workspace-id', secondWorkspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /transactions/:transactionId/attachments/:attachmentId
  // ──────────────────────────────────────────────────
  describe('GET /transactions/:transactionId/attachments/:attachmentId', () => {
    it('should return a presigned download URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/attachments/${seededAttachmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(typeof response.body.url).toBe('string');
      expect(response.body.url).toContain('https://');
    });

    it('should return 404 for non-existent attachment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/attachments/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(404);
    });

    it('should return 404 for attachment on wrong transaction', async () => {
      const otherTxId = await seedTransaction(app, {
        amount: -10,
        date: midMonthDate,
        description: 'Other transaction',
        category: categoryId,
        account: accountId,
        user: userId,
        workspace: workspaceId,
      });

      const response = await request(app.getHttpServer())
        .get(`/transactions/${otherTxId}/attachments/${seededAttachmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(404);
    });

    it('should return 404 for attachment from another workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}/attachments/${seededAttachmentId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .set('x-workspace-id', secondWorkspaceId);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        `/transactions/${transactionId}/attachments/${seededAttachmentId}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // DELETE /transactions/:transactionId/attachments/:attachmentId
  // ──────────────────────────────────────────────────
  describe('DELETE /transactions/:transactionId/attachments/:attachmentId', () => {
    let attachmentToDeleteId: string;

    beforeAll(async () => {
      attachmentToDeleteId = await seedAttachment(app, {
        filename: 'to-delete.jpg',
        s3Key: `workspaces/${workspaceId}/transactions/${transactionId}/delete-me.jpg`,
        mimeType: 'image/jpeg',
        size: 1024,
        transaction: transactionId,
        user: userId,
        workspace: workspaceId,
      });
    });

    it('should delete an attachment and return it', async () => {
      const beforeCount = await countAttachments(app, transactionId);

      const response = await request(app.getHttpServer())
        .delete(
          `/transactions/${transactionId}/attachments/${attachmentToDeleteId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.filename).toBe('to-delete.jpg');

      // Verify it was actually removed from DB
      const afterCount = await countAttachments(app, transactionId);
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should return 404 for already-deleted attachment', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          `/transactions/${transactionId}/attachments/${attachmentToDeleteId}`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent attachment', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/transactions/${transactionId}/attachments/${nonExistentId()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(404);
    });

    it('should return 404 for attachment from another workspace', async () => {
      const attachId = await seedAttachment(app, {
        filename: 'isolation-test.jpg',
        s3Key: `workspaces/${workspaceId}/transactions/${transactionId}/isolation.jpg`,
        mimeType: 'image/jpeg',
        size: 512,
        transaction: transactionId,
        user: userId,
        workspace: workspaceId,
      });

      // Second user tries to delete it from their workspace
      const response = await request(app.getHttpServer())
        .delete(`/transactions/${transactionId}/attachments/${attachId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .set('x-workspace-id', secondWorkspaceId);

      expect(response.status).toBe(404);

      // Verify it is still in DB
      const connection = app.get<Connection>(getConnectionToken());
      const Model = connection.model('Attachment');
      const doc = await Model.findById(attachId);
      expect(doc).not.toBeNull();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/transactions/${transactionId}/attachments/${seededAttachmentId}`,
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // Cascade delete: deleting transaction removes attachments
  // ──────────────────────────────────────────────────
  describe('Transaction deletion cascades to attachments', () => {
    let cascadeTxId: string;

    beforeAll(async () => {
      cascadeTxId = await seedTransaction(app, {
        amount: -100,
        date: midMonthDate,
        description: 'Cascade delete test tx',
        category: categoryId,
        account: accountId,
        user: userId,
        workspace: workspaceId,
      });

      for (let i = 0; i < 3; i++) {
        await seedAttachment(app, {
          filename: `cascade-${i}.jpg`,
          s3Key: `workspaces/${workspaceId}/transactions/${cascadeTxId}/cascade-${i}.jpg`,
          mimeType: 'image/jpeg',
          size: 1024,
          transaction: cascadeTxId,
          user: userId,
          workspace: workspaceId,
        });
      }
    });

    it('should delete all attachments when transaction is deleted', async () => {
      const beforeCount = await countAttachments(app, cascadeTxId);
      expect(beforeCount).toBe(3);

      const response = await request(app.getHttpServer())
        .delete(`/transactions/${cascadeTxId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(response.status).toBe(200);

      const afterCount = await countAttachments(app, cascadeTxId);
      expect(afterCount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────
  // Database state verification
  // ──────────────────────────────────────────────────
  describe('Database state verification', () => {
    let verifyTxId: string;

    beforeAll(async () => {
      verifyTxId = await seedTransaction(app, {
        amount: -30,
        date: midMonthDate,
        description: 'DB verify test tx',
        category: categoryId,
        account: accountId,
        user: userId,
        workspace: workspaceId,
      });
    });

    it('should store correct fields in DB after upload', async () => {
      const fakeFile = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/transactions/${verifyTxId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .attach('file', fakeFile, {
          filename: 'db-verify.jpg',
          contentType: 'image/jpeg',
        });

      expect(uploadResponse.status).toBe(201);

      // Query DB directly
      const connection = app.get<Connection>(getConnectionToken());
      const Model = connection.model('Attachment');
      const docs = await Model.find({ transaction: verifyTxId });

      expect(docs.length).toBe(1);
      const doc = docs[0] as any;
      expect(doc.filename).toBe('db-verify.jpg');
      expect(doc.mimeType).toBe('image/jpeg');
      expect(doc.size).toBe(5);
      expect(doc.s3Key).toContain(
        `workspaces/${workspaceId}/transactions/${verifyTxId}/`,
      );
      expect(doc.s3Key).toMatch(/\.jpg$/);
      expect(doc.transaction.toString()).toBe(verifyTxId);
      expect(doc.user.toString()).toBe(userId);
      expect(doc.workspace.toString()).toBe(workspaceId);
    });
  });
});
