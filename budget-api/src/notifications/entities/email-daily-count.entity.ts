import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type EmailDailyCountDocument = HydratedDocument<EmailDailyCount>;

@Schema()
export class EmailDailyCount {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: string;

  @Prop({ type: String, required: true })
  date: string; // YYYY-MM-DD

  @Prop({ type: Number, default: 0 })
  count: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const EmailDailyCountSchema = SchemaFactory.createForClass(
  EmailDailyCount,
)
  .index({ user: 1, date: 1 }, { unique: true })
  .index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // TTL: 7 days
