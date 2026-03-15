import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import { $t } from '$lib/i18n';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createAccountSchema } from '$lib/schemas/account.schema';
import { createCategorySchema } from '$lib/schemas/category.schema';
import { createTransactionSchema, createTransferSchema } from '$lib/schemas/transaction.schema';
import { addCategoryAction } from '$lib/server/actions/category';

export const load: PageServerLoad = async ({ locals, cookies, fetch, parent }) => {
	const { user } = locals;
	if (!user) {
		throw redirect(302, '/signin');
	}

	// Wait for the layout to resolve (sets X-Workspace-Id cookie for new accounts)
	await parent();

	const currentDate = new Date();
	const dateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
		.toISOString()
		.split('T')[0];
	const dateEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
		.toISOString()
		.split('T')[0];

	// Fetch all independent data in parallel
	const [
		accounts,
		categories,
		transactionsData,
		accountsSummary,
		transactionsSummary,
		usdExchangeRates,
		bills
	] = await Promise.all([
		fetch(`${API_URL}/accounts`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('accounts.loadAccountsError') }, cookies);
				return [];
			}),
		fetch(`${API_URL}/categories/tree`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('categories.loadCategoriesError') }, cookies);
				return [];
			}),
		fetch(`${API_URL}/transactions?limit=5`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('transactions.loadTransactionsError') }, cookies);
				return { data: [] };
			}),
		fetch(`${API_URL}/accounts/summary`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('accounts.loadSummaryError') }, cookies);
				return [];
			}),
		fetch(`${API_URL}/transactions/summary?dateStart=${dateStart}&dateEnd=${dateEnd}`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('transactions.loadSummaryError') }, cookies);
				return [];
			}),
		fetch(`${API_URL}/currencies/USD`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('currencies.loadExchangeRatesError') }, cookies);
				return undefined;
			}),
		fetch(`${API_URL}/bills?dateStart=${dateStart}&dateEnd=${dateEnd}`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('bills.loadBillsError') }, cookies);
				return [];
			})
	]);

	const transactions = transactionsData.data ?? [];

	return {
		addAccountForm: await superValidate(zod4(createAccountSchema)),
		createCategoryForm: await superValidate(zod4(createCategorySchema)),
		addTransactionForm: await superValidate(zod4(createTransactionSchema)),
		addTransferForm: await superValidate(zod4(createTransferSchema)),
		accounts,
		categories,
		transactions,
		transactionsSummary,
		accountsSummary,
		usdExchangeRates,
		bills
	};
};

export const actions: Actions = {
	addAccount: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createAccountSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(`${API_URL}/accounts`, {
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

			setFlash({ type: 'success', message: $t('accounts.addAccountSuccess') }, cookies);
			return { form };
		} catch {
			setFlash({ type: 'error', message: $t('accounts.addAccountError') }, cookies);
			return fail(500, { form });
		}
	},
	addCategory: async (event) => addCategoryAction(event),
	addTransaction: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createTransactionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(`${API_URL}/transactions`, {
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

			setFlash({ type: 'success', message: $t('transactions.addTransactionSuccess') }, cookies);
			return { form };
		} catch {
			setFlash({ type: 'error', message: $t('transactions.addTransactionError') }, cookies);
			return fail(500, { form });
		}
	},
	addTransfer: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createTransferSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch(`${API_URL}/transactions/transfer`, {
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

			setFlash({ type: 'success', message: $t('transactions.addTransactionSuccess') }, cookies);
			return { form };
		} catch {
			setFlash({ type: 'error', message: $t('transactions.addTransactionError') }, cookies);
			return fail(500, { form });
		}
	}
};
