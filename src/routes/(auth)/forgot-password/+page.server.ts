import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { forgotPasswordFormSchema } from '$lib/schemas/auth.schema';
import { fail, redirect } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';

export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(zod4(forgotPasswordFormSchema))
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await superValidate(request, zod4(forgotPasswordFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(`${API_URL}/auth/forgot-password`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form.data)
			});

			if (!response.ok) {
				const { message, statusCode } = await response.json();
				if (statusCode !== 404) {
					if (statusCode === 429) {
						setFlash(
							{ type: 'error', message: $t('forgotPassword.resetPasswordLimitReached') },
							cookies
						);
					} else {
						setFlash({ type: 'error', message }, cookies);
					}
					return fail(statusCode, { form });
				}
			}

			setFlash({ type: 'success', message: $t('forgotPassword.emailSent') }, cookies);
		} catch {
			return fail(500, { form });
		}

		throw redirect(302, '/signin');
	}
};
