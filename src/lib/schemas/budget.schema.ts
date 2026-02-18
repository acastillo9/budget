import { z } from 'zod/v4';

export const createBudgetSchema = z.object({
	id: z.string().optional(),
	name: z.string().max(200).optional(),
	amount: z
		.number()
		.min(1, { message: 'Amount must be at least 1' })
		.default('' as unknown as number),
	period: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('' as unknown as 'WEEKLY'),
	startDate: z.string().min(1, { message: 'Start date is required' }),
	endDate: z.string().optional(),
	categories: z.array(z.string()).min(1, { message: 'At least one category is required' })
});

export type CreateBudgetSchema = z.infer<typeof createBudgetSchema>;
