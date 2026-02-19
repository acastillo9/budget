import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';
import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createAccountSchema } from '$lib/schemas/account.schema';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	// Load accounts from the API
	let accounts = [];
	try {
		const response = await fetch(`${API_URL}/accounts`);
		if (!response.ok) {
			throw new Error('Failed to load accounts');
		}
		accounts = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('accounts.loadAccountsError') }, cookies);
	}

	let accountTypes = [];
	try {
		const response = await fetch(`${API_URL}/account-types`);
		if (!response.ok) {
			throw new Error('Failed to load account types');
		}
		accountTypes = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('accounts.loadAccountTypesError') }, cookies);
	}

	return {
		addAccountForm: await superValidate(zod4(createAccountSchema)),
		accounts,
		accountTypes
	};
};

export const actions: Actions = {
	addAccount: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createAccountSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const isEditing = Boolean(form.data.id);
		try {
			const response = await fetch(`${API_URL}/accounts${isEditing ? `/${form.data.id}` : ''}`, {
				method: isEditing ? 'PATCH' : 'POST',
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

			const message = isEditing
				? $t('accounts.editAccountSuccess')
				: $t('accounts.addAccountSuccess');
			setFlash({ type: 'success', message }, cookies);
			return { form };
		} catch {
			const message = isEditing ? $t('accounts.editAccountError') : $t('accounts.addAccountError');
			setFlash({ type: 'error', message }, cookies);
			return fail(500, { form });
		}
	}
};
