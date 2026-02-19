import { z } from 'zod/v4';

export const createBillSchema = z.object({
	id: z.string().optional(),
	targetDate: z.string().optional(),
	name: z.string().min(1, { message: 'Name is required' }).max(200),
	amount: z
		.number()
		.min(0.01, { message: 'Amount must be greater than 0' })
		.default('' as unknown as number),
	dueDate: z.string().min(1, { message: 'Due date is required' }),
	endDate: z.string().optional(),
	frequency: z
		.enum(['ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'])
		.default('' as unknown as 'ONCE'),
	account: z.string().min(1, { message: 'Account is required' }),
	category: z.string().optional(),
	applyToFuture: z.boolean().optional().default(false)
});

export type CreateBillSchema = z.infer<typeof createBillSchema>;
