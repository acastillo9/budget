import { z } from 'zod/v4';

const channelPreferenceSchema = z.object({
	inApp: z.boolean(),
	email: z.boolean()
});

export const updateNotificationPreferencesSchema = z.object({
	channels: z.record(z.string(), channelPreferenceSchema).optional(),
	budgetThresholdPercent: z.number().min(1).max(100).optional(),
	largeTransactionAmounts: z.record(z.string(), z.number().min(0)).optional(),
	lowBalanceAmounts: z.record(z.string(), z.number().min(0)).optional(),
	billDueSoonDays: z.number().min(1).max(30).optional(),
	quietHoursEnabled: z.boolean().optional(),
	quietHoursStart: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional(),
	quietHoursEnd: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional(),
	quietHoursTimezone: z.string().optional()
});

export type UpdateNotificationPreferencesSchema = z.infer<
	typeof updateNotificationPreferencesSchema
>;
