import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ fetch, params, request }) => {
	const { id, targetDate } = params;
	const { applyToFuture } = await request.json();

	const response = await fetch(`${API_URL}/bills/${id}/${targetDate}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			applyToFuture
		})
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const deletedBill = await response.json();
	return json(deletedBill);
};
