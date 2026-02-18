import { API_URL } from '$env/static/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setFlash } from 'sveltekit-flash-message/server';

export const load: PageServerLoad = async ({ cookies }) => {
	let location;
	try {
		const response = await fetch(`${API_URL}/auth/google`, {
			method: 'GET',
			redirect: 'manual' // Prevents automatic browser redirect
		});

		location = response.headers.get('location');
	} catch {
		setFlash({ type: 'error', message: 'Failed to redirect to Google' }, cookies);
		throw redirect(307, '/signin');
	}

	if (location) {
		throw redirect(302, location); // Redirect the user to Google
	}

	setFlash({ type: 'error', message: 'Failed to redirect to Google' }, cookies);
	throw redirect(307, '/signin');
};
