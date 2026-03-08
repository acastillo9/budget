import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { CategoryDocument } from 'src/categories/entities/category.entity';
import { AccountDocument } from 'src/accounts/entities/account.entity';
import { UserDocument } from 'src/users/entities/user.entity';
import { AuditableSchema } from 'src/shared/schemas';
import { BillDocument } from 'src/bills/entities/bill.entity';
import { WorkspaceDocument } from 'src/workspaces/entities/workspace.entity';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema()
export class Transaction {
  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    autopopulate: { maxDepth: 2 },
  })
  category?: CategoryDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Account',
    required: true,
    autopopulate: { maxDepth: 2 },
  })
  account: AccountDocument;

  @Prop({ type: Boolean, required: true, default: false })
  isTransfer: boolean;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Transaction',
    autopopulate: { maxDepth: 2 },
  })
  transfer?: TransactionDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Bill',
    autopopulate: { maxDepth: 2 },
  })
  bill?: BillDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: { maxDepth: 2 },
  })
  user: UserDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Workspace',
  })
  workspace?: WorkspaceDocument;
}

export const TransactionSchema =
  SchemaFactory.createForClass(Transaction).add(AuditableSchema);
