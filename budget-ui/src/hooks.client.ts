import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = async ({ error }) => {
	const message = error instanceof Error ? error.message : String(error);

	if (
		message.includes('Failed to fetch dynamically imported module') ||
		message.includes('error loading dynamically imported module') ||
		message.includes('Importing a module script failed')
	) {
		window.location.reload();
		return;
	}
};
