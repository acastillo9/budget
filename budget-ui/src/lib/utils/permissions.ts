import type { WorkspaceRole } from '$lib/types/workspace.types';

export function canEdit(role: WorkspaceRole): boolean {
	return role === 'OWNER' || role === 'CONTRIBUTOR';
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
	return role === 'OWNER';
}
