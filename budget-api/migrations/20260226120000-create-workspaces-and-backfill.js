module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    const session = client.startSession();
    await session.withTransaction(async () => {
      const users = await db.collection('users').find({}).toArray();

      for (const user of users) {
        // Create a default workspace for each user
        const workspaceResult = await db.collection('workspaces').insertOne(
          {
            name: `${user.name}'s Workspace`,
            owner: user._id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { session },
        );

        const workspaceId = workspaceResult.insertedId;

        // Create OWNER membership
        await db.collection('workspacemembers').insertOne(
          {
            workspace: workspaceId,
            user: user._id,
            role: 'OWNER',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { session },
        );

        // Backfill workspace on all user data
        const collections = [
          'transactions',
          'budgets',
          'categories',
          'accounts',
          'bills',
        ];

        for (const collectionName of collections) {
          await db
            .collection(collectionName)
            .updateMany(
              { user: user._id, workspace: { $exists: false } },
              { $set: { workspace: workspaceId } },
              { session },
            );
        }
      }

      // Create compound unique index on workspace members
      await db
        .collection('workspacemembers')
        .createIndex({ workspace: 1, user: 1 }, { unique: true, session });
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
      // Remove workspace field from all data collections
      const collections = [
        'transactions',
        'budgets',
        'categories',
        'accounts',
        'bills',
      ];

      for (const collectionName of collections) {
        await db
          .collection(collectionName)
          .updateMany({}, { $unset: { workspace: '' } }, { session });
      }

      // Drop workspace members and workspaces
      await db.collection('workspacemembers').drop({ session });
      await db.collection('workspaces').drop({ session });
    });
    session.endSession();
  },
};
