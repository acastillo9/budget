import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import type { PageServerLoad } from '../$types';
import { $t } from '$lib/i18n';
import { fail, type Actions } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createCategorySchema } from '$lib/schemas/category.schema';
import { createTransactionSchema, createTransferSchema } from '$lib/schemas/transaction.schema';
import { addCategoryAction } from '$lib/server/actions/category';

export const load: PageServerLoad = async ({ cookies, fetch, url, parent }) => {
	// Wait for the layout to resolve (sets X-Workspace-Id cookie for new accounts)
	await parent();

	const offset = url.searchParams.get('offset')
		? parseInt(url.searchParams.get('offset') as string, 10)
		: 0;
	const dateFrom = url.searchParams.get('dateFrom') || undefined;
	const dateTo = url.searchParams.get('dateTo') || undefined;
	const categoryId = url.searchParams.get('categoryId') || undefined;
	const accountId = url.searchParams.get('accountId') || undefined;
	const search = url.searchParams.get('search') || undefined;

	// Build transaction query string
	const params = new URLSearchParams();
	if (offset) params.set('offset', String(offset));
	if (dateFrom) params.set('dateFrom', `${dateFrom}T00:00:00.000Z`);
	if (dateTo) params.set('dateTo', `${dateTo}T00:00:00.000Z`);
	if (categoryId) params.set('categoryId', categoryId);
	if (accountId) params.set('accountId', accountId);
	if (search) params.set('search', search);
	const qs = params.toString();

	// Fetch all data in parallel
	const [accounts, categories, transactionsResult] = await Promise.all([
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
		fetch(`${API_URL}/transactions${qs ? `?${qs}` : ''}`)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.catch(() => {
				setFlash({ type: 'error', message: $t('transactions.loadTransactionsError') }, cookies);
				return { data: [], total: 0, limit: 10, offset, nextPage: null };
			})
	]);

	const transactions = {
		data: transactionsResult.data ?? [],
		total: transactionsResult.total ?? 0,
		limit: transactionsResult.limit ?? 10,
		offset: transactionsResult.offset ?? offset,
		nextPage: transactionsResult.nextPage ?? null
	};

	return {
		createCategoryForm: await superValidate(zod4(createCategorySchema)),
		addTransactionForm: await superValidate(zod4(createTransactionSchema)),
		addTransferForm: await superValidate(zod4(createTransferSchema)),
		transactions: transactions,
		accounts,
		categories,
		filters: { dateFrom, dateTo, categoryId, accountId, search }
	};
};

export const actions: Actions = {
	addCategory: async (event) => addCategoryAction(event),
	addTransaction: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createTransactionSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const isEditing = Boolean(form.data.id);
		try {
			const response = await fetch(
				`${API_URL}/transactions${isEditing ? `/${form.data.id}` : ''}`,
				{
					method: isEditing ? 'PATCH' : 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(form.data)
				}
			);

			if (!response.ok) {
				const { message, statusCode } = await response.json();
				setFlash({ type: 'error', message }, cookies);
				return fail(statusCode, { form });
			}

			if (!isEditing) {
				const result = await response.json();
				form.data.id = result.id;
			}

			const message = isEditing
				? $t('transactions.editTransactionSuccess')
				: $t('transactions.addTransactionSuccess');
			setFlash({ type: 'success', message }, cookies);
			return { form };
		} catch {
			const message = isEditing
				? $t('transactions.editTransactionError')
				: $t('transactions.addTransactionError');
			setFlash({ type: 'error', message }, cookies);
			return fail(500, { form });
		}
	},
	addTransfer: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createTransferSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const isEditing = Boolean(form.data.id);
		try {
			const response = await fetch(
				`${API_URL}/transactions/transfer${isEditing ? `/${form.data.id}` : ''}`,
				{
					method: isEditing ? 'PATCH' : 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(form.data)
				}
			);

			if (!response.ok) {
				const { message, statusCode } = await response.json();
				setFlash({ type: 'error', message }, cookies);
				return fail(statusCode, { form });
			}

			if (!isEditing) {
				const result = await response.json();
				form.data.id = result.id;
			}

			const message = isEditing
				? $t('transactions.editTransactionSuccess')
				: $t('transactions.addTransactionSuccess');
			setFlash({ type: 'success', message }, cookies);
			return { form };
		} catch {
			const message = isEditing
				? $t('transactions.editTransactionError')
				: $t('transactions.addTransactionError');
			setFlash({ type: 'error', message }, cookies);
			return fail(500, { form });
		}
	}
};
