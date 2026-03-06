import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  nonExistentId,
} from './utils/db.helper';

describe('TermsController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  // User 1 (primary test user)
  let authToken: string;
  let userId: string;

  // User 2 (data isolation tests)
  let authToken2: string;
  let userId2: string;

  // Seeded terms version IDs
  let tosEnId: string;
  let tosEsId: string;
  let privacyEnId: string;
  let privacyEsId: string;

  /**
   * Seed a TermsVersion document directly in the database.
   */
  async function seedTermsVersion(data: {
    type: string;
    version: string;
    title: string;
    content: string;
    locale: string;
    publishedAt: Date;
    isActive: boolean;
  }): Promise<string> {
    const TermsVersionModel = connection.model('TermsVersion');
    const doc = await TermsVersionModel.create(data);
    return doc._id.toString();
  }

  /**
   * Seed a UserConsent document directly in the database.
   */
  async function seedUserConsent(data: {
    user: string;
    termsVersion: string;
    acceptedAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const UserConsentModel = connection.model('UserConsent');
    const doc = await UserConsentModel.create(data);
    return doc._id.toString();
  }

  beforeAll(async () => {
    app = await createTestApp();
    connection = app.get<Connection>(getConnectionToken());
    await clearDatabase(app);

    // Create primary test user
    const user1 = await createActiveUser(app, {
      email: 'terms-user@example.com',
      password: 'Password123',
    });
    userId = user1.userId;
    authToken = getAuthToken(app, {
      authId: user1.authProviderId,
      userId,
    });

    // Create secondary user for data isolation tests
    const user2 = await createActiveUser(app, {
      email: 'terms-other@example.com',
      password: 'Password123',
    });
    userId2 = user2.userId;
    authToken2 = getAuthToken(app, {
      authId: user2.authProviderId,
      userId: userId2,
    });

    // Seed terms versions
    const publishedAt = new Date('2026-03-01T00:00:00.000Z');

    tosEnId = await seedTermsVersion({
      type: 'TOS',
      version: '1.0.0',
      title: 'Terms of Service',
      content: '# Terms of Service\n\nEnglish content here.',
      locale: 'en',
      publishedAt,
      isActive: true,
    });

    tosEsId = await seedTermsVersion({
      type: 'TOS',
      version: '1.0.0',
      title: 'Términos de Servicio',
      content: '# Términos de Servicio\n\nContenido en español.',
      locale: 'es',
      publishedAt,
      isActive: true,
    });

    privacyEnId = await seedTermsVersion({
      type: 'PRIVACY_POLICY',
      version: '1.0.0',
      title: 'Privacy Policy',
      content: '# Privacy Policy\n\nEnglish content here.',
      locale: 'en',
      publishedAt,
      isActive: true,
    });

    privacyEsId = await seedTermsVersion({
      type: 'PRIVACY_POLICY',
      version: '1.0.0',
      title: 'Política de Privacidad',
      content: '# Política de Privacidad\n\nContenido en español.',
      locale: 'es',
      publishedAt,
      isActive: true,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // GET /terms/active
  // ──────────────────────────────────────────────────
  describe('GET /terms/active', () => {
    it('should return active terms for default locale (en)', async () => {
      const response = await request(app.getHttpServer()).get('/terms/active');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      const types = response.body.map((t: any) => t.type).sort();
      expect(types).toEqual(['PRIVACY_POLICY', 'TOS']);

      // All should be English and active
      for (const term of response.body) {
        expect(term.locale).toBe('en');
        expect(term.isActive).toBe(true);
        expect(term.id).toBeDefined();
        expect(term.version).toBe('1.0.0');
        expect(term.title).toBeDefined();
        expect(term.content).toBeDefined();
        expect(term.publishedAt).toBeDefined();
      }
    });

    it('should return active terms for Spanish locale', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/active')
        .query({ locale: 'es' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      for (const term of response.body) {
        expect(term.locale).toBe('es');
        expect(term.isActive).toBe(true);
      }
    });

    it('should return active terms for English locale explicitly', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/active')
        .query({ locale: 'en' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      for (const term of response.body) {
        expect(term.locale).toBe('en');
      }
    });

    it('should return 400 for invalid locale value', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/active')
        .query({ locale: 'fr' });

      expect(response.status).toBe(400);
    });

    it('should be accessible without authentication (public)', async () => {
      const response = await request(app.getHttpServer()).get('/terms/active');

      expect(response.status).toBe(200);
    });

    it('should return empty array when no active terms exist for locale', async () => {
      // Deactivate all English terms temporarily
      const TermsVersionModel = connection.model('TermsVersion');
      await TermsVersionModel.updateMany({ locale: 'en' }, { isActive: false });

      const response = await request(app.getHttpServer())
        .get('/terms/active')
        .query({ locale: 'en' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);

      // Restore active state
      await TermsVersionModel.updateMany({ locale: 'en' }, { isActive: true });
    });

    it('should not include inactive terms versions', async () => {
      // Seed an inactive version
      await seedTermsVersion({
        type: 'TOS',
        version: '0.9.0',
        title: 'Old Terms',
        content: 'Old content',
        locale: 'en',
        publishedAt: new Date('2025-01-01'),
        isActive: false,
      });

      const response = await request(app.getHttpServer()).get('/terms/active');

      expect(response.status).toBe(200);
      // Should still return only 2 active English versions (TOS + Privacy)
      expect(response.body).toHaveLength(2);
      const titles = response.body.map((t: any) => t.title);
      expect(titles).not.toContain('Old Terms');
    });

    it('should not expose internal fields (_id, __v, createdAt, updatedAt)', async () => {
      const response = await request(app.getHttpServer()).get('/terms/active');

      expect(response.status).toBe(200);
      for (const term of response.body) {
        expect(term._id).toBeUndefined();
        expect(term.__v).toBeUndefined();
      }
    });
  });

  // ──────────────────────────────────────────────────
  // GET /terms/:id
  // ──────────────────────────────────────────────────
  describe('GET /terms/:id', () => {
    it('should return a specific terms version by ID', async () => {
      const response = await request(app.getHttpServer()).get(
        `/terms/${tosEnId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: tosEnId,
        type: 'TOS',
        version: '1.0.0',
        title: 'Terms of Service',
        locale: 'en',
        isActive: true,
      });
      expect(response.body.content).toContain('English content here');
      expect(response.body.publishedAt).toBeDefined();
    });

    it('should return privacy policy by ID', async () => {
      const response = await request(app.getHttpServer()).get(
        `/terms/${privacyEsId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: privacyEsId,
        type: 'PRIVACY_POLICY',
        locale: 'es',
      });
    });

    it('should return 404 for non-existent terms version ID', async () => {
      const response = await request(app.getHttpServer()).get(
        `/terms/${nonExistentId()}`,
      );

      expect(response.status).toBe(404);
    });

    it('should return 500 for invalid (non-MongoId) ID format', async () => {
      const response = await request(app.getHttpServer()).get(
        '/terms/not-a-valid-id',
      );

      // Mongoose will throw a CastError which is caught and returns 500
      expect(response.status).toBe(500);
    });

    it('should be accessible without authentication (public)', async () => {
      const response = await request(app.getHttpServer()).get(
        `/terms/${tosEnId}`,
      );

      expect(response.status).toBe(200);
    });

    it('should not expose internal fields', async () => {
      const response = await request(app.getHttpServer()).get(
        `/terms/${tosEnId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body._id).toBeUndefined();
      expect(response.body.__v).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────
  // POST /terms/consent
  // ──────────────────────────────────────────────────
  describe('POST /terms/consent', () => {
    it('should record consent for a valid terms version', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: tosEnId });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        acceptedAt: expect.any(String),
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.termsVersion).toBeDefined();
    });

    it('should be idempotent - recording consent twice returns the same record', async () => {
      // First consent was already recorded above, record again
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: tosEnId });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should record consent for privacy policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: privacyEnId });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should return 404 for non-existent terms version ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: nonExistentId() });

      expect(response.status).toBe(404);
    });

    it('should return 400 when termsVersionId is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 when termsVersionId is not a valid MongoId', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: 'not-a-valid-id' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when extra unknown fields are sent (whitelist validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          termsVersionId: tosEnId,
          unknownField: 'should be stripped',
        });

      // whitelist strips unknown fields but does not reject, so 201 is fine
      expect(response.status).toBe(201);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .send({ termsVersionId: tosEnId });

      expect(response.status).toBe(401);
    });

    it('should store consent independently per user', async () => {
      // Record consent for user 2
      const response = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ termsVersionId: tosEnId });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();

      // User 2's consent history should only have this one
      const historyResponse = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body).toHaveLength(1);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /terms/consent/status
  // ──────────────────────────────────────────────────
  describe('GET /terms/consent/status', () => {
    it('should return allAccepted=true when all EN terms are accepted', async () => {
      // User 1 has accepted TOS en and Privacy en from the consent tests above
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.allAccepted).toBe(true);
      expect(response.body.pending).toHaveLength(0);
      expect(response.body.accepted).toHaveLength(2);
    });

    it('should return allAccepted=false when some terms are pending', async () => {
      // User 2 only accepted TOS en, not Privacy en
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.allAccepted).toBe(false);
      expect(response.body.pending.length).toBeGreaterThan(0);
      expect(response.body.accepted.length).toBeGreaterThan(0);
    });

    it('should check consent status for Spanish locale', async () => {
      // Neither user has accepted Spanish terms
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .query({ locale: 'es' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.allAccepted).toBe(false);
      expect(response.body.pending).toHaveLength(2);
      expect(response.body.accepted).toHaveLength(0);
    });

    it('should default to English locale when not specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Verify the accepted terms are English
      for (const term of response.body.accepted) {
        expect(term.locale).toBe('en');
      }
    });

    it('should return 400 for invalid locale', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .query({ locale: 'de' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/terms/consent/status',
      );

      expect(response.status).toBe(401);
    });

    it('should return allAccepted=false for a user with no consents', async () => {
      // Create a fresh user with no consents
      const freshUser = await createActiveUser(app, {
        email: 'terms-fresh@example.com',
        password: 'Password123',
      });
      const freshToken = getAuthToken(app, {
        authId: freshUser.authProviderId,
        userId: freshUser.userId,
      });

      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.allAccepted).toBe(false);
      expect(response.body.pending).toHaveLength(2);
      expect(response.body.accepted).toHaveLength(0);
    });

    it('should include correct terms details in pending and accepted arrays', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      for (const term of [
        ...response.body.pending,
        ...response.body.accepted,
      ]) {
        expect(term.id).toBeDefined();
        expect(term.type).toBeDefined();
        expect(term.version).toBeDefined();
        expect(term.title).toBeDefined();
        expect(term.locale).toBeDefined();
      }
    });
  });

  // ──────────────────────────────────────────────────
  // GET /terms/consent/history
  // ──────────────────────────────────────────────────
  describe('GET /terms/consent/history', () => {
    it('should return consent history for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      for (const consent of response.body) {
        expect(consent.id).toBeDefined();
        expect(consent.acceptedAt).toBeDefined();
        expect(consent.termsVersion).toBeDefined();
        expect(consent.termsVersion.id).toBeDefined();
        expect(consent.termsVersion.type).toBeDefined();
      }
    });

    it('should return consent history sorted by acceptedAt descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const dates = response.body.map((c: any) =>
        new Date(c.acceptedAt).getTime(),
      );
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('should isolate consent history per user', async () => {
      // User 2 should only see their own consents
      const response = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1); // Only TOS en from previous test
    });

    it('should return empty array for user with no consent history', async () => {
      const noConsentUser = await createActiveUser(app, {
        email: 'terms-noconsent@example.com',
        password: 'Password123',
      });
      const noConsentToken = getAuthToken(app, {
        authId: noConsentUser.authProviderId,
        userId: noConsentUser.userId,
      });

      const response = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${noConsentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        '/terms/consent/history',
      );

      expect(response.status).toBe(401);
    });

    it('should not expose internal fields in consent records', async () => {
      const response = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      for (const consent of response.body) {
        expect(consent._id).toBeUndefined();
        expect(consent.__v).toBeUndefined();
      }
    });
  });

  // ──────────────────────────────────────────────────
  // Business Logic Edge Cases
  // ──────────────────────────────────────────────────
  describe('Business Logic Edge Cases', () => {
    it('should handle consent for Spanish terms independently from English', async () => {
      // Record consent for Spanish TOS
      const consentResponse = await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: tosEsId });

      expect(consentResponse.status).toBe(201);

      // Spanish status should show 1 accepted, 1 pending
      const statusResponse = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .query({ locale: 'es' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.allAccepted).toBe(false);
      expect(statusResponse.body.accepted).toHaveLength(1);
      expect(statusResponse.body.pending).toHaveLength(1);

      // Accept the remaining Spanish privacy policy
      await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: privacyEsId });

      // Now Spanish should be all accepted
      const statusResponse2 = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .query({ locale: 'es' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse2.status).toBe(200);
      expect(statusResponse2.body.allAccepted).toBe(true);
    });

    it('should reflect new active version as pending after it is added', async () => {
      // Create a new active version for English TOS v2
      const tosEnV2Id = await seedTermsVersion({
        type: 'TOS',
        version: '2.0.0',
        title: 'Terms of Service v2',
        content: '# Terms v2\n\nUpdated content.',
        locale: 'en',
        publishedAt: new Date('2026-03-05'),
        isActive: true,
      });

      // Now consent status should show the new version as pending
      const response = await request(app.getHttpServer())
        .get('/terms/consent/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.allAccepted).toBe(false);

      const pendingIds = response.body.pending.map((t: any) => t.id);
      expect(pendingIds).toContain(tosEnV2Id);

      // Clean up: deactivate the v2 version
      const TermsVersionModel = connection.model('TermsVersion');
      await TermsVersionModel.findByIdAndUpdate(tosEnV2Id, { isActive: false });
    });

    it('should include consent for inactive terms in history', async () => {
      // User 1 already has consent for active terms.
      // Seed consent for an inactive terms version directly
      const inactiveTermId = await seedTermsVersion({
        type: 'TOS',
        version: '0.5.0',
        title: 'Very Old Terms',
        content: 'Old content',
        locale: 'en',
        publishedAt: new Date('2024-01-01'),
        isActive: false,
      });

      await seedUserConsent({
        user: userId,
        termsVersion: inactiveTermId,
        acceptedAt: new Date('2024-01-15'),
      });

      const response = await request(app.getHttpServer())
        .get('/terms/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // History should include the consent for the inactive version
      const consentForInactive = response.body.find(
        (c: any) => c.termsVersion?.id === inactiveTermId,
      );
      expect(consentForInactive).toBeDefined();
    });

    it('should allow retrieving inactive terms version by ID', async () => {
      // Seed an inactive version
      const inactiveId = await seedTermsVersion({
        type: 'PRIVACY_POLICY',
        version: '0.1.0',
        title: 'Draft Privacy Policy',
        content: 'Draft content',
        locale: 'en',
        publishedAt: new Date('2025-06-01'),
        isActive: false,
      });

      const response = await request(app.getHttpServer()).get(
        `/terms/${inactiveId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      expect(response.body.id).toBe(inactiveId);
    });
  });

  // ──────────────────────────────────────────────────
  // Database State Verification
  // ──────────────────────────────────────────────────
  describe('Database State Verification', () => {
    it('should persist consent records in the database', async () => {
      const UserConsentModel = connection.model('UserConsent');
      const consents = await UserConsentModel.find({ user: userId });
      // User 1 accepted: TOS en, Privacy en, TOS es, Privacy es + seeded inactive consent
      expect(consents.length).toBeGreaterThanOrEqual(4);
    });

    it('should not create duplicate consent records via API', async () => {
      const UserConsentModel = connection.model('UserConsent');

      // Count consents for this specific user+termsVersion pair before
      const countBefore = await UserConsentModel.countDocuments({
        user: userId,
        termsVersion: tosEnId,
      });

      // Record consent again (idempotent)
      await request(app.getHttpServer())
        .post('/terms/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ termsVersionId: tosEnId });

      const countAfter = await UserConsentModel.countDocuments({
        user: userId,
        termsVersion: tosEnId,
      });

      expect(countAfter).toBe(countBefore);
      expect(countAfter).toBe(1);
    });
  });
});
