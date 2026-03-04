import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { TransactionDocument } from 'src/transactions/entities/transaction.entity';
import { UserDocument } from 'src/users/entities/user.entity';
import { WorkspaceDocument } from 'src/workspaces/entities/workspace.entity';
import { AuditableSchema } from 'src/shared/schemas';

export type AttachmentDocument = HydratedDocument<Attachment>;

@Schema()
export class Attachment {
  @Prop({ type: String, required: true })
  filename: string;

  @Prop({ type: String, required: true })
  s3Key: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Transaction',
    required: true,
  })
  transaction: TransactionDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  user: UserDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Workspace',
    required: true,
  })
  workspace: WorkspaceDocument;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const AttachmentSchema =
  SchemaFactory.createForClass(Attachment).add(AuditableSchema);
