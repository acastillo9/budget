import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditableSchema } from 'src/shared/schemas';
import { TermsType } from './terms-type.enum';
import { TermsLocale } from './terms-locale.enum';

export type TermsVersionDocument = HydratedDocument<TermsVersion>;

@Schema()
export class TermsVersion {
  @Prop({ type: String, enum: TermsType, required: true })
  type: TermsType;

  @Prop({ type: String, required: true })
  version: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, enum: TermsLocale, required: true })
  locale: TermsLocale;

  @Prop({ type: Date, required: true })
  publishedAt: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const TermsVersionSchema = SchemaFactory.createForClass(TermsVersion)
  .add(AuditableSchema)
  .index({ type: 1, locale: 1, isActive: 1 })
  .index({ type: 1, version: 1, locale: 1 }, { unique: true });
