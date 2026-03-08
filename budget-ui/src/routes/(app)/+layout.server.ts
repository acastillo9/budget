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

	// Fetch currency rates and workspaces in parallel
	let currencyRates: CurrencyRates | undefined = undefined;
	let workspaces: Workspace[] = [];
	let currentWorkspace: Workspace | undefined = undefined;
	let workspaceRole: WorkspaceRole | undefined = undefined;
	let hasCollaborators = false;

	const [currencyResult, wsResult] = await Promise.all([
		fetch(`${API_URL}/currencies/${user.currencyCode}`)
			.then(async (r) => (r.ok ? r.json() : undefined))
			.catch(() => undefined),
		fetch(`${API_URL}/workspaces`)
			.then(async (r) => (r.ok ? r.json() : []))
			.catch(() => [])
	]);

	currencyRates = currencyResult;
	if (!currencyRates) {
		setFlash({ type: 'error', message: $t('currencies.loadCurrenciesError') }, cookies);
	}

	workspaces = wsResult;

	// Determine current workspace from cookie or default to first
	const workspaceIdFromCookie = cookies.get('X-Workspace-Id');
	currentWorkspace =
		workspaces.find((w: Workspace) => w.id === workspaceIdFromCookie) || workspaces[0];

	if (currentWorkspace && currentWorkspace.id !== workspaceIdFromCookie) {
		cookies.set('X-Workspace-Id', currentWorkspace.id, {
			path: '/',
			sameSite: 'strict',
			httpOnly: false
		});
	}

	// Fetch current workspace details and members in parallel
	if (currentWorkspace) {
		const [currentData, members] = await Promise.all([
			fetch(`${API_URL}/workspaces/current`)
				.then(async (r) => (r.ok ? r.json() : undefined))
				.catch(() => undefined),
			fetch(`${API_URL}/workspaces/members`)
				.then(async (r) => (r.ok ? r.json() : []))
				.catch(() => [])
		]);

		if (currentData) {
			currentWorkspace = currentData;
		}

		if (members.length > 0) {
			const myMembership = members.find(
				(m: { user: string | { id: string } }) =>
					(typeof m.user === 'string' ? m.user : m.user?.id) === user.id
			);
			workspaceRole = myMembership?.role;
			hasCollaborators = members.length > 1;
		}
	}

	return { user, currencyRates, workspaces, currentWorkspace, workspaceRole, hasCollaborators };
};
