import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({ fetch, params }) => {
	const { id } = params;

	const response = await fetch(`${API_URL}/notifications/${id}/read`, {
		method: 'PATCH'
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	return json(await response.json());
};
