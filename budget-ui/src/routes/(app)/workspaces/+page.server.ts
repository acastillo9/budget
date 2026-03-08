import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import { $t } from '$lib/i18n';
import type { PageServerLoad } from './$types';
import type { WorkspaceMember, Invitation } from '$lib/types/workspace.types';
import type { ConsentStatus, UserConsent } from '$lib/types/terms.types';

export const load: PageServerLoad = async ({ fetch, cookies, parent }) => {
	// Wait for the layout to resolve (sets X-Workspace-Id cookie for new accounts)
	await parent();

	let members: WorkspaceMember[] = [];
	let invitations: Invitation[] = [];
	let consentStatus: ConsentStatus | null = null;
	let consentHistory: UserConsent[] = [];

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

	try {
		const statusResponse = await fetch(`${API_URL}/terms/consent/status`);
		if (statusResponse.ok) {
			consentStatus = await statusResponse.json();
		}
	} catch {
		// Consent status may fail, that's ok for existing users
	}

	try {
		const historyResponse = await fetch(`${API_URL}/terms/consent/history`);
		if (historyResponse.ok) {
			consentHistory = await historyResponse.json();
		}
	} catch {
		// Consent history may fail, that's ok for existing users
	}

	return { members, invitations, consentStatus, consentHistory };
};
