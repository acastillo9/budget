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

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
	const { user } = locals;
	if (!user) {
		throw redirect(302, '/signin');
	}

	// Load accounts from the API
	let accounts = [];
	try {
		const response = await fetch(`${API_URL}/accounts?limit=5`);
		if (!response.ok) {
			throw new Error('Failed to load accounts');
		}
		accounts = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('accounts.loadAccountsError') }, cookies);
	}

	// load categories from the API
	let categories = [];
	try {
		const response = await fetch(`${API_URL}/categories/tree`);
		if (!response.ok) {
			throw new Error('Failed to load categories');
		}
		categories = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('categories.loadCategoriesError') }, cookies);
	}

	// load transactions from the API
	let transactions = [];
	try {
		const response = await fetch(`${API_URL}/transactions?limit=5`);
		if (!response.ok) {
			throw new Error('Failed to load transactions');
		}
		const { data } = await response.json();
		transactions = data;
	} catch {
		setFlash({ type: 'error', message: $t('transactions.loadTransactionsError') }, cookies);
	}

	// Get the total balance, income, and expenses
	let accountsSummary = [];
	try {
		const response = await fetch(`${API_URL}/accounts/summary`);
		if (!response.ok) {
			throw new Error('Failed to load account summary');
		}
		accountsSummary = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('accounts.loadSummaryError') }, cookies);
	}

	let transactionsSummary = [];
	try {
		const response = await fetch(`${API_URL}/transactions/summary`);
		if (!response.ok) {
			throw new Error('Failed to load transaction summary');
		}
		transactionsSummary = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('transactions.loadSummaryError') }, cookies);
	}

	// load USD exchange rates
	let usdExchangeRates = undefined;
	try {
		const response = await fetch(`${API_URL}/currencies/USD`);
		if (!response.ok) {
			throw new Error('Failed to load exchange rates');
		}
		usdExchangeRates = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('currencies.loadExchangeRatesError') }, cookies);
	}

	// Load bills for the current month
	let bills = [];
	const currentDate = new Date();
	const dateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
		.toISOString()
		.split('T')[0];
	const dateEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
		.toISOString()
		.split('T')[0];
	try {
		const response = await fetch(`${API_URL}/bills?dateStart=${dateStart}&dateEnd=${dateEnd}`);
		if (!response.ok) {
			throw new Error('Failed to load bills');
		}
		bills = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('bills.loadBillsError') }, cookies);
	}

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
