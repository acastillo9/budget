import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/auth/decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceRole } from '../entities/workspace-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.workspaceRole) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // OWNER has implicit access to everything
    if (user.workspaceRole === WorkspaceRole.OWNER) {
      return true;
    }

    if (!requiredRoles.includes(user.workspaceRole)) {
      throw new HttpException(
        'Insufficient workspace permissions',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
