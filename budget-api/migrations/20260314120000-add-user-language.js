module.exports = {
  async up(db) {
    // Set language: 'es' for users with currencyCode 'COP' (Colombian Peso)
    await db
      .collection('users')
      .updateMany({ currencyCode: 'COP' }, { $set: { language: 'es' } });

    // Set language: 'en' for all other users
    await db
      .collection('users')
      .updateMany(
        { currencyCode: { $ne: 'COP' } },
        { $set: { language: 'en' } },
      );
  },

  async down(db) {
    await db
      .collection('users')
      .updateMany({}, { $unset: { language: '' } });
  },
};
