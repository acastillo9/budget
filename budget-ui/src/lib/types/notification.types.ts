export type NotificationType =
	| 'BILL_OVERDUE'
	| 'BILL_DUE_SOON'
	| 'BUDGET_THRESHOLD'
	| 'BUDGET_EXCEEDED'
	| 'LOW_BALANCE'
	| 'LARGE_TRANSACTION'
	| 'RECURRING_BILL_ENDING'
	| 'WORKSPACE_INVITATION'
	| 'MONTHLY_SUMMARY';

export type Notification = {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	isRead: boolean;
	readAt?: string;
	data?: Record<string, unknown>;
	actionUrl?: string;
	createdAt: string;
};

export type PaginatedNotifications = {
	data: Notification[];
	total: number;
	limit: number;
	offset: number;
	nextPage: number | null;
};

export type ChannelPreference = {
	inApp: boolean;
	email: boolean;
};

export type NotificationPreference = {
	id: string;
	channels: Record<NotificationType, ChannelPreference>;
	budgetThresholdPercent: number;
	largeTransactionAmount: number;
	lowBalanceAmount: number;
	billDueSoonDays: number;
	quietHoursEnabled: boolean;
	quietHoursStart: string;
	quietHoursEnd: string;
	quietHoursTimezone: string;
};

export type UpdateNotificationPreference = Partial<Omit<NotificationPreference, 'id'>>;
