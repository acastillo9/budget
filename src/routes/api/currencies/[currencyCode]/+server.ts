import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const { currencyCode } = params;

	const response = await fetch(`${API_URL}/currencies/${currencyCode}`);

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const currencies = await response.json();
	return json(currencies);
};
