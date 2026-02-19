import { z } from 'zod/v4';

export const createCategorySchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, { message: 'Name is required' }).max(200),
	icon: z.string(),
	categoryType: z.enum(['INCOME', 'EXPENSE'])
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
