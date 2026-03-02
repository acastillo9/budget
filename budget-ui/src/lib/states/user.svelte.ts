import type { UserState } from '$lib/types';

export const userState: UserState = $state({
	user: undefined,
	currencyRates: undefined,
	workspaces: [],
	currentWorkspace: undefined,
	workspaceRole: undefined,
	hasCollaborators: false
});

export function syncUserState(data: {
	user: UserState['user'];
	currencyRates: UserState['currencyRates'];
	workspaces?: UserState['workspaces'];
	currentWorkspace: UserState['currentWorkspace'];
	workspaceRole: UserState['workspaceRole'];
	hasCollaborators?: UserState['hasCollaborators'];
}) {
	userState.user = data.user;
	userState.currencyRates = data.currencyRates;
	userState.workspaces = data.workspaces ?? [];
	userState.currentWorkspace = data.currentWorkspace;
	userState.workspaceRole = data.workspaceRole;
	userState.hasCollaborators = data.hasCollaborators ?? false;
}
