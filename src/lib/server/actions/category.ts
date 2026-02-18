import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';
import { createCategorySchema } from '$lib/schemas/category.schema';
import { fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { RequestEvent } from '@sveltejs/kit';

export async function addCategoryAction({
	request,
	cookies,
	fetch
}: Pick<RequestEvent, 'request' | 'cookies' | 'fetch'>) {
	const form = await superValidate(request, zod4(createCategorySchema));

	if (!form.valid) {
		return fail(400, { form });
	}

	const isEditing = Boolean(form.data.id);
	try {
		const response = await fetch(`${API_URL}/categories${isEditing ? `/${form.data.id}` : ''}`, {
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
			? $t('categories.editCategorySuccess')
			: $t('categories.addCategorySuccess');
		setFlash({ type: 'success', message }, cookies);
		return { form };
	} catch {
		const message = isEditing
			? $t('categories.editCategoryError')
			: $t('categories.addCategoryError');
		setFlash({ type: 'error', message }, cookies);
		return fail(500, { form });
	}
}
