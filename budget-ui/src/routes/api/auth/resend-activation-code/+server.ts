import { API_URL } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const { email } = await request.json();

	const response = await fetch(`${API_URL}/auth/resend-activation-code`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ email })
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	const { activationCodeResendAt } = await response.json();
	return json({
		activationCodeResendAt
	});
};
