import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
      const membership = await this.workspacesService.findMembership(
        workspaceIdHeader,
        user.userId,
      );
      if (!membership) {
        throw new HttpException(
          'Not a member of this workspace',
          HttpStatus.FORBIDDEN,
        );
      }
      user.workspaceId = workspaceIdHeader;
      user.workspaceRole = membership.role;
      return true;
    }

    // Default to user's first workspace
    const workspaces = await this.workspacesService.findByUser(user.userId);
    if (workspaces.length > 0) {
      const defaultWorkspace = workspaces[0];
      const membership = await this.workspacesService.findMembership(
        defaultWorkspace.id,
        user.userId,
      );
      user.workspaceId = defaultWorkspace.id;
      user.workspaceRole = membership?.role;
    }

    return true;
  }
}
