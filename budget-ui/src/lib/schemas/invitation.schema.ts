import { z } from 'zod/v4';

export const createInvitationSchema = z.object({
	email: z.string().email(),
	role: z.enum(['OWNER', 'CONTRIBUTOR', 'VIEWER'])
});

export type CreateInvitationSchema = z.infer<typeof createInvitationSchema>;
