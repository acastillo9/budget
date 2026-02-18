import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ request, cookies }) => {
	const url = new URL(request.url);
	const searchParams = url.searchParams;
	const access_token = searchParams.get('access_token');
	const refresh_token = searchParams.get('refresh_token');

	// Set the cookie
	cookies.set('AuthorizationToken', `${access_token}`, {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.MODE === 'production', // Use secure cookies in production
		sameSite: 'lax'
	});

	cookies.set('RefreshToken', `${refresh_token}`, {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.MODE === 'production', // Use secure cookies in production
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30 // 30 days
	});

	throw redirect(302, '/');
};
