import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ fetch, params }) => {
	const { invitationId } = params;

	const response = await fetch(`${API_URL}/workspaces/invitations/${invitationId}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		const { message, statusCode } = await response.json();
		return error(statusCode, { message });
	}

	return json(await response.json());
};
