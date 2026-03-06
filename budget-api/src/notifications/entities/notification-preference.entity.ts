import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { UserDocument } from 'src/users/entities/user.entity';
import { WorkspaceDocument } from 'src/workspaces/entities/workspace.entity';

const ChannelToggleSchema = {
  inApp: { type: Boolean, default: true },
  email: { type: Boolean, default: true },
};

const ChannelToggleEmailOffSchema = {
  inApp: { type: Boolean, default: true },
  email: { type: Boolean, default: false },
};

const ChannelToggleInAppOffSchema = {
  inApp: { type: Boolean, default: false },
  email: { type: Boolean, default: true },
};

export type NotificationPreferenceDocument =
  HydratedDocument<NotificationPreference>;

@Schema()
export class NotificationPreference {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: UserDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Workspace' })
  workspace?: WorkspaceDocument;

  @Prop({
    type: {
      BILL_OVERDUE: ChannelToggleSchema,
      BILL_DUE_SOON: ChannelToggleSchema,
      BUDGET_THRESHOLD: ChannelToggleSchema,
      BUDGET_EXCEEDED: ChannelToggleSchema,
      LOW_BALANCE: ChannelToggleSchema,
      LARGE_TRANSACTION: ChannelToggleEmailOffSchema,
      RECURRING_BILL_ENDING: ChannelToggleSchema,
      WORKSPACE_INVITATION: ChannelToggleEmailOffSchema,
      MONTHLY_SUMMARY: ChannelToggleInAppOffSchema,
      _id: false,
    },
    default: {},
  })
  channels: Record<string, { inApp: boolean; email: boolean }>;

  @Prop({ type: Number, default: 80 })
  budgetThresholdPercent: number;

  @Prop({ type: SchemaTypes.Mixed, default: { USD: 500, COP: 2000000 } })
  largeTransactionAmounts: Record<string, number>;

  @Prop({ type: SchemaTypes.Mixed, default: { USD: 100, COP: 500000 } })
  lowBalanceAmounts: Record<string, number>;

  @Prop({ type: Number, default: 3 })
  billDueSoonDays: number;

  @Prop({ type: Boolean, default: false })
  quietHoursEnabled: boolean;

  @Prop({ type: String, default: '22:00' })
  quietHoursStart: string;

  @Prop({ type: String, default: '08:00' })
  quietHoursEnd: string;

  @Prop({ type: String, default: 'UTC' })
  quietHoursTimezone: string;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
)
  .add(AuditableSchema)
  .index({ user: 1, workspace: 1 }, { unique: true });
