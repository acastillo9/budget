import { API_URL } from '$env/static/private';
import type { PageServerLoad } from './$types';
import type { TermsVersion } from '$lib/types/terms.types';

export const load: PageServerLoad = async ({ fetch }) => {
	let terms: TermsVersion | null = null;
	let error = false;

	try {
		const response = await fetch(`${API_URL}/terms/active`);
		if (response.ok) {
			const data: TermsVersion[] = await response.json();
			terms = data.find((t) => t.type === 'TOS') ?? null;
		} else {
			error = true;
		}
	} catch {
		error = true;
	}

	return { terms, error };
};
