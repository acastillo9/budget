import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const locale = url.searchParams.get('locale') || 'en';
	const response = await fetch(`${API_URL}/terms/consent/status?locale=${locale}`);

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	return json(await response.json());
};
