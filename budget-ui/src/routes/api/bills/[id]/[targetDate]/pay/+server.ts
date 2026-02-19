import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ fetch, params, request }) => {
	const { id, targetDate } = params;
	const { paidDate } = await request.json();

	const response = await fetch(`${API_URL}/bills/${id}/${targetDate}/pay`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			paidDate
		})
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const updatedBill = await response.json();
	return json(updatedBill);
};
