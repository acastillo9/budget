import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TermsVersion,
  TermsVersionSchema,
} from './entities/terms-version.entity';
import { UserConsent, UserConsentSchema } from './entities/user-consent.entity';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TermsVersion.name, schema: TermsVersionSchema },
      { name: UserConsent.name, schema: UserConsentSchema },
    ]),
  ],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
