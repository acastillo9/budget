module.exports = {
  async up(db) {
    await db.collection('workspaces').updateMany({}, { $unset: { name: '' } });
  },

  async down(db) {
    const workspaces = await db.collection('workspaces').find({}).toArray();
    for (const workspace of workspaces) {
      const owner = await db
        .collection('users')
        .findOne({ _id: workspace.owner });
      const name = owner ? `${owner.name}'s Workspace` : 'Workspace';
      await db
        .collection('workspaces')
        .updateOne({ _id: workspace._id }, { $set: { name } });
    }
  },
};
