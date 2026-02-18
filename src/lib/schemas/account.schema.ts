import { z } from 'zod/v4';

export const createAccountSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, { message: 'Name is required' }).max(200),
	balance: z
		.number()
		.min(0, { message: 'Balance must be a positive number' })
		.default('' as unknown as number),
	accountType: z.string(),
	currencyCode: z.enum(['USD', 'COP'])
});

export type CreateAccountSchema = z.infer<typeof createAccountSchema>;
