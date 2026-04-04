import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { NotificationType } from './notification-type.enum';

export type DigestQueueDocument = HydratedDocument<DigestQueue>;

@Schema()
export class DigestQueue {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Workspace' })
  workspace?: string;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: SchemaTypes.Mixed })
  data?: Record<string, unknown>;

  @Prop({ type: String })
  actionUrl?: string;

  @Prop({ type: Boolean, default: false })
  sent: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const DigestQueueSchema = SchemaFactory.createForClass(DigestQueue)
  .index({ user: 1, sent: 1, createdAt: -1 })
  .index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // TTL: 7 days
