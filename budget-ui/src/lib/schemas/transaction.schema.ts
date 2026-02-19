import { z } from 'zod/v4';

export const createTransactionSchema = z.object({
	id: z.string().optional(),
	amount: z
		.number()
		.min(0.01, { message: 'Amount must be greater than 0' })
		.default('' as unknown as number),
	date: z.string().min(1, { message: 'Date is required' }),
	description: z.string().min(1, { message: 'Description is required' }),
	notes: z.string().optional(),
	account: z.string().min(1, { message: 'Account is required' }),
	category: z.string().optional()
});

export type CreateTransactionSchema = z.infer<typeof createTransactionSchema>;

export const createTransferSchema = z.object({
	id: z.string().optional(),
	amount: z
		.number()
		.min(0.01, { message: 'Amount must be greater than 0' })
		.default('' as unknown as number),
	date: z.string().min(1, { message: 'Date is required' }),
	description: z.string().min(1, { message: 'Description is required' }),
	notes: z.string().optional(),
	originAccount: z.string().min(1, { message: 'Origin account is required' }),
	account: z.string().min(1, { message: 'Target account is required' })
});

export type CreateTransferSchema = z.infer<typeof createTransferSchema>;
