import { API_URL } from '$env/static/private';
import { type Handle, type HandleFetch } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';

const getUserFromToken = async (token: string) => {
	const res = await fetch(`${API_URL}/auth/me`, {
		headers: { Authorization: `Bearer ${token}` },
		method: 'GET'
	});

	if (res.status === 401) {
		throw new Error('Access token expired');
	}
	if (!res.ok) {
		throw new Error(`Unexpected /auth/me error: ${res.status}`);
	}

	return res.json();
};

const refreshTokens = async (refreshToken: string) => {
	const res = await fetch(`${API_URL}/auth/refresh`, {
		headers: { Authorization: `Bearer ${refreshToken}` },
		method: 'GET'
	});

	if (res.status === 401) {
		throw new Error('Refresh token invalid or expired');
	}
	if (!res.ok) {
		throw new Error(`Unexpected /auth/refresh error: ${res.status}`);
	}

	try {
		return await res.json();
	} catch {
		throw new Error('Failed to parse /auth/refresh response as JSON');
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	const lang = event.request.headers.get('accept-language')?.split(',')[0];
	if (lang) {
		locale.set(lang);
	}

	const { cookies } = event;
	const accessToken = cookies.get('AuthorizationToken');

	if (!accessToken) {
		cookies.delete('AuthorizationToken', { path: '/' });
		cookies.delete('RefreshToken', { path: '/' });
		return resolve(event);
	}

	try {
		event.locals.user = await getUserFromToken(accessToken);
		return resolve(event); // User is valid: proceed
	} catch {
		const refreshToken = cookies.get('RefreshToken');
		if (!refreshToken) {
			cookies.delete('AuthorizationToken', { path: '/' });
			cookies.delete('RefreshToken', { path: '/' });
			return resolve(event);
		}

		try {
			const { access_token, refresh_token, isLongLived } = await refreshTokens(refreshToken);

			// Overwrite cookies with new tokens
			cookies.set('AuthorizationToken', access_token, {
				httpOnly: true,
				secure: import.meta.env.MODE === 'production', // Use secure cookies in production
				sameSite: 'strict',
				path: '/'
			});

			cookies.set('RefreshToken', refresh_token, {
				httpOnly: true,
				secure: import.meta.env.MODE === 'production', // Use secure cookies in production
				sameSite: 'strict',
				path: '/',
				maxAge: isLongLived ? 60 * 60 * 24 * 30 : 60 * 60 * 2 // 30 days for long-lived, 2 hours for short-lived
			});

			// Finally, fetch the user profile with the new access token
			event.locals.user = await getUserFromToken(access_token);
			return resolve(event);
		} catch {
			cookies.delete('AuthorizationToken', { path: '/' });
			cookies.delete('RefreshToken', { path: '/' });
			return resolve(event); // User is invalid: proceed without user
		}
	}
};

export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
	const token = event.cookies.get('AuthorizationToken');
	if (token) {
		request.headers.set('Authorization', `Bearer ${token}`);
	}

	request.headers.set('Accept-Language', event.request.headers.get('accept-language') || 'en');

	return fetch(request);
};
