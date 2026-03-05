import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationLockDocument = HydratedDocument<NotificationLock>;

@Schema()
export class NotificationLock {
  @Prop({ type: String, required: true, unique: true })
  jobName: string;

  @Prop({ type: Date, required: true })
  lockedAt: Date;

  @Prop({ type: String, required: true })
  lockedBy: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const NotificationLockSchema = SchemaFactory.createForClass(
  NotificationLock,
).index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
