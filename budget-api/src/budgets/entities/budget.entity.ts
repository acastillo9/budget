import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { UserDocument } from 'src/users/entities/user.entity';
import { CategoryDocument } from 'src/categories/entities/category.entity';
import { BudgetPeriod } from './budget-period.enum';
import { WorkspaceDocument } from 'src/workspaces/entities/workspace.entity';

export type BudgetDocument = HydratedDocument<Budget>;

@Schema()
export class Budget {
  @Prop({ type: String })
  name: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, enum: BudgetPeriod, required: true })
  period: BudgetPeriod;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({
    type: [{ type: SchemaTypes.ObjectId, ref: 'Category' }],
    required: true,
    autopopulate: true,
  })
  categories: CategoryDocument[];

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

export const BudgetSchema =
  SchemaFactory.createForClass(Budget).add(AuditableSchema);
