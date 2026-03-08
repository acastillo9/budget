import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/auth/decorators/public.decorator';
import { WorkspacesService } from '../workspaces.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      return true;
    }

    const workspaceIdHeader = request.headers['x-workspace-id'];

    if (workspaceIdHeader) {
      const membership = await this.workspacesService.findMembershipLean(
        workspaceIdHeader,
        user.userId,
      );
      if (membership) {
        user.workspaceId = workspaceIdHeader;
        user.workspaceRole = membership.role;
        return true;
      }
      // Header workspace is invalid (stale cookie or removed member) — fall through to default
    }

    // Default to user's first workspace
    const defaultWorkspaceId =
      await this.workspacesService.findDefaultWorkspaceIdByUser(user.userId);
    if (defaultWorkspaceId) {
      user.workspaceId = defaultWorkspaceId;
      // Only set workspaceRole when there was no explicit header workspace,
      // otherwise a user not in the header workspace would inherit OWNER from
      // their own default workspace, bypassing @Roles checks.
      if (!workspaceIdHeader) {
        const membership = await this.workspacesService.findMembershipLean(
          defaultWorkspaceId,
          user.userId,
        );
        user.workspaceRole = membership?.role;
      }
    }

    return true;
  }
}
