const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const contentDir = path.join(__dirname, '../src/terms/content');

    const tosEn = fs.readFileSync(
      path.join(contentDir, 'terms-of-service.en.md'),
      'utf-8',
    );
    const tosEs = fs.readFileSync(
      path.join(contentDir, 'terms-of-service.es.md'),
      'utf-8',
    );
    const privacyEn = fs.readFileSync(
      path.join(contentDir, 'privacy-policy.en.md'),
      'utf-8',
    );
    const privacyEs = fs.readFileSync(
      path.join(contentDir, 'privacy-policy.es.md'),
      'utf-8',
    );

    const now = new Date();

    // Check if terms already exist to make migration idempotent
    const existing = await db
      .collection('termsversions')
      .countDocuments({ version: '1.0.0' });
    if (existing > 0) {
      console.log('Terms versions already seeded, skipping.');
      return;
    }

    const session = client.startSession();
    await session.withTransaction(async () => {
      await db.collection('termsversions').insertMany(
        [
          {
            type: 'TOS',
            version: '1.0.0',
            title: 'Terms of Service',
            content: tosEn,
            locale: 'en',
            publishedAt: now,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            type: 'TOS',
            version: '1.0.0',
            title: 'Terminos de Servicio',
            content: tosEs,
            locale: 'es',
            publishedAt: now,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            type: 'PRIVACY_POLICY',
            version: '1.0.0',
            title: 'Privacy Policy',
            content: privacyEn,
            locale: 'en',
            publishedAt: now,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            type: 'PRIVACY_POLICY',
            version: '1.0.0',
            title: 'Politica de Privacidad',
            content: privacyEs,
            locale: 'es',
            publishedAt: now,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        { session },
      );
    });
    session.endSession();
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    const session = client.startSession();
    await session.withTransaction(async () => {
      await db
        .collection('termsversions')
        .deleteMany({ version: '1.0.0' }, { session });
    });
    session.endSession();
  },
};
