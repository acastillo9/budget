import { API_URL } from '$env/static/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	await fetch(`${API_URL}/auth/logout`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	});
	cookies.delete('AuthorizationToken', { path: '/' });
	cookies.delete('RefreshToken', { path: '/' });
	throw redirect(303, '/signin');
};
