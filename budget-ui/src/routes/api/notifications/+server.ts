import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const queryString = url.searchParams.toString();
	const apiUrl = queryString
		? `${API_URL}/notifications?${queryString}`
		: `${API_URL}/notifications`;

	const response = await fetch(apiUrl);

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	return json(await response.json());
};
