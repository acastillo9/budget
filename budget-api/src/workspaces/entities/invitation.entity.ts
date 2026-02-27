import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/shared/schemas';
import { WorkspaceDocument } from './workspace.entity';
import { WorkspaceRole } from './workspace-role.enum';
import { InvitationStatus } from './invitation-status.enum';

export type InvitationDocument = HydratedDocument<Invitation>;

@Schema()
export class Invitation {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, enum: WorkspaceRole, required: true })
  role: WorkspaceRole;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Workspace',
    required: true,
    autopopulate: true,
  })
  workspace: WorkspaceDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  invitedBy: UserDocument;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({
    type: String,
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;
}

export const InvitationSchema =
  SchemaFactory.createForClass(Invitation).add(AuditableSchema);

InvitationSchema.index({ workspace: 1, email: 1 });
InvitationSchema.index({ token: 1 }, { unique: true });
