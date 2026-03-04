import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const { transactionId, attachmentId } = params;

	const response = await fetch(
		`${API_URL}/transactions/${transactionId}/attachments/${attachmentId}`,
		{
			method: 'GET'
		}
	);

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const data = await response.json();
	return json(data);
};

export const DELETE: RequestHandler = async ({ fetch, params }) => {
	const { transactionId, attachmentId } = params;

	const response = await fetch(
		`${API_URL}/transactions/${transactionId}/attachments/${attachmentId}`,
		{
			method: 'DELETE'
		}
	);

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const deletedAttachment = await response.json();
	return json(deletedAttachment);
};
