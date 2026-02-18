import { superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from '../$types';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createCategorySchema } from '$lib/schemas/category.schema';
import type { Actions } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';
import type { Category } from '$lib/types/category.types';
import { addCategoryAction } from '$lib/server/actions/category';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	let categories: Category[] = [];
	try {
		const response = await fetch(`${API_URL}/categories`);
		if (!response.ok) {
			throw new Error('Failed to load categories');
		}
		categories = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('categories.loadCategoriesError') }, cookies);
	}

	return {
		createCategoryForm: await superValidate(zod4(createCategorySchema)),
		categories
	};
};

export const actions: Actions = {
	addCategory: async (event) => addCategoryAction(event)
};
