import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ fetch, params }) => {
	const { id } = params;

	const response = await fetch(`${API_URL}/categories/${id}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const deletedCategory = await response.json();
	return json(deletedCategory);
};
