import type { PageServerLoad } from './$types';
import { API_URL } from '$env/static/private';
import { redirect } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';

export const load: PageServerLoad = async ({ url, cookies, fetch }) => {
	let location;
	try {
		const response = await fetch(`${API_URL}/auth/google-redirect${url.search}`, {
			method: 'GET',
			redirect: 'manual' // Prevents automatic browser redirect
		});

		location = response.headers.get('location');
	} catch {
		setFlash({ type: 'error', message: 'Failed to redirect to Google' }, cookies);
		throw redirect(307, '/signin');
	}

	if (location) {
		throw redirect(302, location);
	}

	setFlash({ type: 'error', message: 'Failed to redirect to Google' }, cookies);
	throw redirect(307, '/signin');
};
