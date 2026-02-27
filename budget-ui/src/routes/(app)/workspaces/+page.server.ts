import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import { $t } from '$lib/i18n';
import type { PageServerLoad } from './$types';
import type { WorkspaceMember, Invitation } from '$lib/types/workspace.types';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	let members: WorkspaceMember[] = [];
	let invitations: Invitation[] = [];

	try {
		const membersResponse = await fetch(`${API_URL}/workspaces/members`);
		if (membersResponse.ok) {
			members = await membersResponse.json();
		}
	} catch {
		setFlash({ type: 'error', message: $t('workspaces.loadMembersError') }, cookies);
	}

	try {
		const invitationsResponse = await fetch(`${API_URL}/workspaces/invitations`);
		if (invitationsResponse.ok) {
			invitations = await invitationsResponse.json();
		}
	} catch {
		// Invitations may fail if user is not OWNER, that's ok
	}

	return { members, invitations };
};
