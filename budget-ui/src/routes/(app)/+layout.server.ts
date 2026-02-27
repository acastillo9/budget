import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import type { LayoutServerLoad } from './$types';
import { $t } from '$lib/i18n';
import type { CurrencyRates } from '$lib/types';
import type { Workspace, WorkspaceRole } from '$lib/types/workspace.types';
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

	// Fetch user workspaces
	let workspaces: Workspace[] = [];
	let currentWorkspace: Workspace | undefined = undefined;
	let workspaceRole: WorkspaceRole | undefined = undefined;
	try {
		const wsResponse = await fetch(`${API_URL}/workspaces`);
		if (wsResponse.ok) {
			workspaces = await wsResponse.json();
		}

		// Determine current workspace from cookie or default to first
		const workspaceIdFromCookie = cookies.get('X-Workspace-Id');
		currentWorkspace = workspaces.find((w) => w.id === workspaceIdFromCookie) || workspaces[0];

		if (currentWorkspace && !workspaceIdFromCookie) {
			cookies.set('X-Workspace-Id', currentWorkspace.id, {
				path: '/',
				sameSite: 'strict',
				httpOnly: false
			});
		}

		// Get the current workspace details to determine role
		if (currentWorkspace) {
			const currentResponse = await fetch(`${API_URL}/workspaces/current`);
			if (currentResponse.ok) {
				const currentData = await currentResponse.json();
				currentWorkspace = currentData;
			}

			// Get membership to determine role
			const membersResponse = await fetch(`${API_URL}/workspaces/members`);
			if (membersResponse.ok) {
				const members = await membersResponse.json();
				const myMembership = members.find(
					(m: { user: string | { id: string } }) =>
						(typeof m.user === 'string' ? m.user : m.user?.id) === user.id
				);
				workspaceRole = myMembership?.role;
			}
		}
	} catch {
		// Workspaces may not be available yet (pre-migration)
	}

	return { user, currencyRates, workspaces, currentWorkspace, workspaceRole };
};
