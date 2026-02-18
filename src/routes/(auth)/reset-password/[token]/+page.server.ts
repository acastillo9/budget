import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';
import { passwordSchema, passwordWithTokenSchema } from '$lib/schemas/auth.schema';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { token } = params;
	try {
		const response = await fetch(`${API_URL}/auth/verify-set-password-token/${token}`);
		if (!response.ok) {
			const { message } = await response.json();
			setFlash({ type: 'error', message }, cookies);
			throw redirect(302, '/forgot-password');
		}
	} catch {
		setFlash({ type: 'error', message: $t('resetPassword.invalidToken') }, cookies);
		throw redirect(302, '/forgot-password');
	}

	return {
		accessToken: token,
		form: await superValidate(zod4(passwordSchema))
	};
};

export const actions: Actions = {
	password: async ({ request, cookies }) => {
		const form = await superValidate(request, zod4(passwordWithTokenSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(`${API_URL}/auth/set-password/${form.data.accessToken}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form.data)
			});

			if (!response.ok) {
				const { message, statusCode } = await response.json();
				setFlash({ type: 'error', message }, cookies);
				return fail(statusCode, { form });
			}

			setFlash({ type: 'success', message: $t('resetPassword.passwordResetSuccess') }, cookies);
		} catch {
			setFlash({ type: 'error', message: $t('resetPassword.passwordResetError') }, cookies);
			return fail(500, { form });
		}

		throw redirect(302, '/signin');
	}
};
