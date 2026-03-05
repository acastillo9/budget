import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { NotificationType } from './notification-type.enum';
import { UserDocument } from 'src/users/entities/user.entity';
import { WorkspaceDocument } from 'src/workspaces/entities/workspace.entity';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema()
export class Notification {
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: SchemaTypes.Mixed })
  data?: Record<string, any>;

  @Prop({ type: String })
  actionUrl?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: UserDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Workspace' })
  workspace?: WorkspaceDocument;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification)
  .add(AuditableSchema)
  .index({ user: 1, workspace: 1, createdAt: -1 })
  .index({ user: 1, workspace: 1, isRead: 1 })
  .index({ createdAt: 1 });
