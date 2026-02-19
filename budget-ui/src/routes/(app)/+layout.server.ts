import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import type { LayoutServerLoad } from './$types';
import { $t } from '$lib/i18n';
import type { CurrencyRates } from '$lib/types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, cookies, fetch }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/signin');
	}

	// Get the currency exhange rates
	let currencyRates: CurrencyRates | undefined = undefined;
	try {
		const response = await fetch(`${API_URL}/currencies/${user.currencyCode}`);
		if (!response.ok) {
			throw new Error('Failed to load rates');
		}
		currencyRates = await response.json();
	} catch {
		setFlash({ type: 'error', message: $t('currencies.loadCurrenciesError') }, cookies);
	}

	return { user: user, currencyRates };
};
