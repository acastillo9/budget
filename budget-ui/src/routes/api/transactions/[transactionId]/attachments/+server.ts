import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const { transactionId } = params;

	const response = await fetch(`${API_URL}/transactions/${transactionId}/attachments`, {
		method: 'GET'
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const attachments = await response.json();
	return json(attachments);
};

export const POST: RequestHandler = async ({ request, fetch, params }) => {
	const { transactionId } = params;

	const formData = await request.formData();

	const response = await fetch(`${API_URL}/transactions/${transactionId}/attachments`, {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const attachment = await response.json();
	return json(attachment);
};
