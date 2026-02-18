import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from '../$types';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createBudgetSchema } from '$lib/schemas/budget.schema';
import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import { $t } from '$lib/i18n';
import { fail, type Actions } from '@sveltejs/kit';
import type { Budget, BudgetProgress } from '$lib/types/budget.types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	// Load categories from the API
	let categories = [];
	try {
		const response = await fetch(`${API_URL}/categories`);
		if (!response.ok) {
			throw new Error('Failed to load categories');
		}
		categories = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('categories.loadCategoriesError') }, cookies);
	}

	// Load budgets from the API
	let budgets: Budget[] = [];
	try {
		const response = await fetch(`${API_URL}/budgets`);
		if (!response.ok) {
			throw new Error('Failed to load budgets');
		}
		budgets = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('budgets.loadBudgetsError') }, cookies);
	}

	// Fetch progress for each budget in parallel
	let budgetProgressList: BudgetProgress[] = [];
	if (budgets.length > 0) {
		try {
			const progressResults = await Promise.all(
				budgets.map(async (budget) => {
					const response = await fetch(`${API_URL}/budgets/${budget.id}/progress`);
					if (!response.ok) {
						throw new Error(`Failed to load progress for budget ${budget.id}`);
					}
					const progressArray: BudgetProgress[] = await response.json();
					// The progress endpoint returns an array; we take the first (current period)
					return progressArray[0] ?? null;
				})
			);
			budgetProgressList = progressResults.filter((p): p is BudgetProgress => p !== null);
		} catch {
			setFlash({ type: 'error', message: $t('budgets.loadBudgetsError') }, cookies);
		}
	}

	return {
		createBudgetForm: await superValidate(zod4(createBudgetSchema)),
		categories,
		budgets: budgetProgressList
	};
};

export const actions: Actions = {
	addBudget: async ({ request, cookies, fetch }) => {
		const form = await superValidate(request, zod4(createBudgetSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const isEditing = Boolean(form.data.id);
		try {
			const response = await fetch(`${API_URL}/budgets${isEditing ? `/${form.data.id}` : ''}`, {
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

			const message = isEditing ? $t('budgets.editBudgetSuccess') : $t('budgets.addBudgetSuccess');
			setFlash({ type: 'success', message }, cookies);
			return { form };
		} catch {
			const message = isEditing ? $t('budgets.editBudgetError') : $t('budgets.addBudgetError');
			setFlash({ type: 'error', message }, cookies);
			return fail(500, { form });
		}
	}
};
