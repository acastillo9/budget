import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const response = await fetch(`${API_URL}/terms/${params.id}`);

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	return json(await response.json());
};
