import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { UserDocument } from 'src/users/entities/user.entity';
import { CategoryType } from './category-type.enum';
import { WorkspaceDocument } from 'src/workspaces/entities/workspace.entity';

export type CategoryDocument = HydratedDocument<Category>;

@Schema()
export class Category {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  icon: string;

  @Prop({ type: String, enum: CategoryType, required: true })
  categoryType: CategoryType;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    default: null,
    autopopulate: true,
  })
  parent?: CategoryDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: true,
  })
  user: UserDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Workspace',
  })
  workspace?: WorkspaceDocument;
}

export const CategorySchema =
  SchemaFactory.createForClass(Category).add(AuditableSchema);

CategorySchema.index({ parent: 1, user: 1 });
