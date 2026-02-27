import type { Cookies } from '@sveltejs/kit';

export function getRedirectTo(cookies: Cookies): string {
	const target = cookies.get('redirectTo');
	cookies.delete('redirectTo', { path: '/' });
	if (target && target.startsWith('/') && !target.startsWith('//')) {
		return target;
	}
	return '/';
}
