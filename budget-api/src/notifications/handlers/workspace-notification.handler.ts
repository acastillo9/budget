import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationDispatcher } from '../services/notification-dispatcher.service';
import { NotificationType } from '../entities/notification-type.enum';

export interface WorkspaceInvitationCreatedEvent {
  invitation: any;
  workspaceId: string;
  invitedUserId?: string;
  invitedByName?: string;
}

@Injectable()
export class WorkspaceNotificationHandler {
  private readonly logger: Logger = new Logger(
    WorkspaceNotificationHandler.name,
  );

  constructor(private readonly dispatcher: NotificationDispatcher) {}

  @OnEvent('workspace.invitation.created')
  async handleInvitationCreated(
    event: WorkspaceInvitationCreatedEvent,
  ): Promise<void> {
    try {
      if (!event.invitedUserId) {
        this.logger.debug(
          'No invitedUserId provided, skipping in-app notification',
        );
        return;
      }

      await this.dispatcher.dispatch({
        type: NotificationType.WORKSPACE_INVITATION,
        userId: event.invitedUserId,
        workspaceId: event.workspaceId,
        title: 'Workspace Invitation',
        message: `${event.invitedByName || 'Someone'} invited you to join a workspace`,
        data: {
          invitationId:
            event.invitation?._id?.toString() || event.invitation?.id,
        },
        actionUrl: '/workspaces',
        deduplicationKey: `workspace_invitation_${event.invitation?._id?.toString() || event.invitation?.id}`,
      });
    } catch (error) {
      this.logger.error(
        `Error handling workspace.invitation.created: ${error.message}`,
        error.stack,
      );
    }
  }
}
