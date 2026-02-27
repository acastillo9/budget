import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/shared/schemas';
import { WorkspaceDocument } from './workspace.entity';
import { WorkspaceRole } from './workspace-role.enum';

export type WorkspaceMemberDocument = HydratedDocument<WorkspaceMember>;

@Schema()
export class WorkspaceMember {
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
  user: UserDocument;

  @Prop({ type: String, enum: WorkspaceRole, required: true })
  role: WorkspaceRole;
}

export const WorkspaceMemberSchema =
  SchemaFactory.createForClass(WorkspaceMember).add(AuditableSchema);

WorkspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });
