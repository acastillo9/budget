import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { UserDocument } from 'src/users/entities/user.entity';
import { TermsVersionDocument } from './terms-version.entity';

export type UserConsentDocument = HydratedDocument<UserConsent>;

@Schema()
export class UserConsent {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: UserDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'TermsVersion',
    required: true,
    autopopulate: true,
  })
  termsVersion: TermsVersionDocument;

  @Prop({ type: Date, required: true })
  acceptedAt: Date;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;
}

export const UserConsentSchema = SchemaFactory.createForClass(UserConsent)
  .add(AuditableSchema)
  .index({ user: 1, termsVersion: 1 }, { unique: true });
