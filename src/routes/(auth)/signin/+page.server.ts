import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { API_URL } from '$env/static/private';
import { superValidate } from 'sveltekit-superforms';
import { loginFormSchema } from '$lib/schemas/auth.schema';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setFlash } from 'sveltekit-flash-message/server';
import { $t } from '$lib/i18n';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;
	if (user) {
		throw redirect(302, '/');
	}

	return {
		form: await superValidate(zod4(loginFormSchema))
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await superValidate(request, zod4(loginFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(`${API_URL}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(form.data)
			});

			if (!response.ok) {
				setFlash({ type: 'error', message: $t('signIn.signInError') }, cookies);
				return fail(401, { form });
			}

			const { access_token, refresh_token } = await response.json();

			// Set the cookie
			cookies.set('AuthorizationToken', `${access_token}`, {
				httpOnly: true,
				path: '/',
				secure: import.meta.env.MODE === 'production', // Use secure cookies in production
				sameSite: 'strict'
			});

			if (refresh_token) {
				cookies.set('RefreshToken', `${refresh_token}`, {
					httpOnly: true,
					path: '/',
					secure: import.meta.env.MODE === 'production', // Use secure cookies in production
					sameSite: 'strict',
					maxAge: form.data.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 2 // 30 days for long-lived, 2 hours for short-lived
				});
			}
		} catch {
			setFlash({ type: 'error', message: $t('signIn.signInError') }, cookies);
			return fail(401, { form });
		}

		throw redirect(302, '/');
	}
};
