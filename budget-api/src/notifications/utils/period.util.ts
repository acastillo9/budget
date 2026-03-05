/**
 * Shared period calculation utilities used by both
 * BudgetCheckerJob and TransactionNotificationHandler.
 */

export function getPeriodStart(
  budgetStart: Date,
  period: string,
  currentDate: Date,
): Date {
  let windowStart = new Date(budgetStart);
  while (true) {
    const windowEnd = addPeriod(windowStart, period);
    if (windowEnd > currentDate) break;
    windowStart = windowEnd;
  }
  return windowStart;
}

export function addPeriod(date: Date, period: string): Date {
  const result = new Date(date);
  switch (period) {
    case 'WEEKLY':
      result.setDate(result.getDate() + 7);
      break;
    case 'MONTHLY':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'YEARLY':
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  return result;
}
