import '$lib/i18n';
import { API_URL } from '$env/static/private';
import { type Handle, type HandleFetch } from '@sveltejs/kit';
import { locale, waitLocale } from 'svelte-i18n';

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
	const { cookies } = event;
	const accessToken = cookies.get('AuthorizationToken');

	if (!accessToken) {
		cookies.delete('AuthorizationToken', { path: '/' });
		cookies.delete('RefreshToken', { path: '/' });
		cookies.delete('X-Workspace-Id', { path: '/' });
	} else {
		try {
			event.locals.user = await getUserFromToken(accessToken);
		} catch {
			const refreshToken = cookies.get('RefreshToken');
			if (!refreshToken) {
				cookies.delete('AuthorizationToken', { path: '/' });
				cookies.delete('RefreshToken', { path: '/' });
				cookies.delete('X-Workspace-Id', { path: '/' });
			} else {
				try {
					const { access_token, refresh_token, isLongLived } = await refreshTokens(refreshToken);

					// Overwrite cookies with new tokens
					cookies.set('AuthorizationToken', access_token, {
						httpOnly: true,
						secure: import.meta.env.MODE === 'production',
						sameSite: 'strict',
						path: '/'
					});

					cookies.set('RefreshToken', refresh_token, {
						httpOnly: true,
						secure: import.meta.env.MODE === 'production',
						sameSite: 'strict',
						path: '/',
						maxAge: isLongLived ? 60 * 60 * 24 * 30 : 60 * 60 * 2
					});

					event.locals.user = await getUserFromToken(access_token);
				} catch {
					cookies.delete('AuthorizationToken', { path: '/' });
					cookies.delete('RefreshToken', { path: '/' });
					cookies.delete('X-Workspace-Id', { path: '/' });
				}
			}
		}
	}

	// Set locale from user's saved language preference, falling back to Accept-Language header
	const lang =
		event.locals.user?.language ||
		event.request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
	if (lang) {
		locale.set(lang);
	}
	await waitLocale();

	return resolve(event);
};

export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
	const token = event.cookies.get('AuthorizationToken');
	if (token) {
		request.headers.set('Authorization', `Bearer ${token}`);
	}

	const workspaceId = event.cookies.get('X-Workspace-Id');
	if (workspaceId) {
		request.headers.set('X-Workspace-Id', workspaceId);
	}

	request.headers.set(
		'Accept-Language',
		event.locals.user?.language || event.request.headers.get('accept-language') || 'en'
	);

	return fetch(request);
};
