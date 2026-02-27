import { Request } from 'express';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';

export interface Session {
  authId: string;
  userId: string;
  name?: string;
  email?: string;
  picture?: string;
  currencyCode?: string;
  refreshToken?: string;
  isLongLived?: boolean;
  workspaceId?: string;
  workspaceRole?: WorkspaceRole;
}

export interface AuthenticatedRequest extends Request {
  user: Session;
}
