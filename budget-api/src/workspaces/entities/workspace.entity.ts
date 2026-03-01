import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/shared/schemas';

export type WorkspaceDocument = HydratedDocument<Workspace>;

@Schema()
export class Workspace {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  owner: UserDocument;
}

export const WorkspaceSchema =
  SchemaFactory.createForClass(Workspace).add(AuditableSchema);
