import type { Notification, NotificationType } from '$lib/types/notification.types';

type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

const REQUIRED_KEYS: Record<NotificationType, string[]> = {
	BUDGET_EXCEEDED: ['budgetName', 'percentUsed'],
	BUDGET_THRESHOLD: ['budgetName', 'percentUsed'],
	LARGE_TRANSACTION: ['amount'],
	LOW_BALANCE: ['accountName', 'balance', 'threshold'],
	BILL_OVERDUE: ['billName'],
	BILL_DUE_SOON: ['billName', 'daysUntilDue'],
	RECURRING_BILL_ENDING: ['billName', 'daysUntilEnd'],
	WORKSPACE_INVITATION: ['invitedByName'],
	MONTHLY_SUMMARY: ['monthDate', 'hasActivity']
};

function hasI18nData(notification: Notification): boolean {
	const required = REQUIRED_KEYS[notification.type];
	if (!required || !notification.data) return false;
	return required.every((key) => key in notification.data!);
}

export function getNotificationTitle(notification: Notification, t: TranslateFunction): string {
	if (!hasI18nData(notification)) return notification.title;
	return t(`notifications.inAppMessages.${notification.type}.title`, {
		values: notification.data as Record<string, unknown>
	});
}

export function getNotificationMessage(
	notification: Notification,
	t: TranslateFunction,
	locale: string | null | undefined
): string {
	if (!hasI18nData(notification)) return notification.message;

	const data = notification.data!;

	if (notification.type === 'MONTHLY_SUMMARY') {
		const monthDate = new Date(data.monthDate as string);
		const monthName = new Intl.DateTimeFormat(locale || 'en', {
			month: 'long',
			year: 'numeric'
		}).format(monthDate);
		const messageKey =
			data.hasActivity === 'true'
				? 'notifications.inAppMessages.MONTHLY_SUMMARY.messageWithActivity'
				: 'notifications.inAppMessages.MONTHLY_SUMMARY.messageNoActivity';
		return t(messageKey, {
			values: {
				monthName,
				totalIncome: data.totalIncome,
				totalExpenses: data.totalExpenses,
				netSavings: data.netSavings
			}
		});
	}

	return t(`notifications.inAppMessages.${notification.type}.message`, {
		values: data as Record<string, unknown>
	});
}
