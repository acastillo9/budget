export type Workspace = {
	id: string;
	owner: { id: string; name: string };
	createdAt: string;
	updatedAt: string;
};

export type WorkspaceRole = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

export type WorkspaceMember = {
	id: string;
	workspace: string;
	user: {
		id: string;
		name: string;
		email: string;
		picture: string;
	};
	role: WorkspaceRole;
};

export type Invitation = {
	id: string;
	email: string;
	role: WorkspaceRole;
	workspace: Workspace;
	invitedBy: {
		id: string;
		name: string;
		email: string;
	};
	expiresAt: string;
	status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
	createdAt: string;
};
