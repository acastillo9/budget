module.exports = {
  async up(db) {
    const lessUrgentTypes = [
      'BILL_DUE_SOON',
      'BUDGET_THRESHOLD',
      'LOW_BALANCE',
      'RECURRING_BILL_ENDING',
    ];

    // Build filter: only target users who still have all 4 less-urgent types
    // with email=true (the old default), indicating they never customized
    const filter = {};
    const update = {};
    for (const type of lessUrgentTypes) {
      filter[`channels.${type}.email`] = true;
      update[`channels.${type}.email`] = false;
    }

    await db
      .collection('notificationpreferences')
      .updateMany(filter, { $set: update });

    // Enable quiet hours for users who have it disabled (the old default)
    await db
      .collection('notificationpreferences')
      .updateMany(
        { quietHoursEnabled: { $ne: true } },
        { $set: { quietHoursEnabled: true } },
      );
  },

  async down(db) {
    const lessUrgentTypes = [
      'BILL_DUE_SOON',
      'BUDGET_THRESHOLD',
      'LOW_BALANCE',
      'RECURRING_BILL_ENDING',
    ];

    const update = {};
    for (const type of lessUrgentTypes) {
      update[`channels.${type}.email`] = true;
    }

    await db
      .collection('notificationpreferences')
      .updateMany({}, { $set: update });

    await db
      .collection('notificationpreferences')
      .updateMany({}, { $set: { quietHoursEnabled: false } });
  },
};
