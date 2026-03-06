import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { TermsVersion } from './entities/terms-version.entity';
import { UserConsent } from './entities/user-consent.entity';
import { TermsLocale } from './entities/terms-locale.enum';
import { TermsVersionDto } from './dto/terms-version.dto';
import { UserConsentDto } from './dto/user-consent.dto';
import { ConsentStatusDto } from './dto/consent-status.dto';

@Injectable()
export class TermsService {
  private readonly logger: Logger = new Logger(TermsService.name);

  constructor(
    @InjectModel(TermsVersion.name)
    private readonly termsVersionModel: Model<TermsVersion>,
    @InjectModel(UserConsent.name)
    private readonly userConsentModel: Model<UserConsent>,
  ) {}

  /**
   * Get all active terms versions for a given locale.
   * @param locale The locale to filter by.
   * @returns Active terms versions (TOS and Privacy Policy).
   */
  async getActiveTerms(locale: TermsLocale): Promise<TermsVersionDto[]> {
    try {
      const terms = await this.termsVersionModel.find({
        isActive: true,
        locale,
      });
      return terms.map((term) =>
        plainToClass(TermsVersionDto, term.toObject()),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get active terms: ${msg}`, stack);
      throw new HttpException(
        'Error getting active terms',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific terms version by ID.
   * @param id The MongoDB ID of the terms version.
   * @returns The terms version.
   */
  async getTermsById(id: string): Promise<TermsVersionDto> {
    try {
      const term = await this.termsVersionModel.findById(id);
      if (!term) {
        throw new HttpException(
          'Terms version not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return plainToClass(TermsVersionDto, term.toObject());
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get terms by id: ${msg}`, stack);
      throw new HttpException(
        'Error getting terms version',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Record user acceptance of a terms version. Idempotent.
   * @param userId The user ID.
   * @param termsVersionId The terms version ID.
   * @param ipAddress Optional IP address.
   * @param userAgent Optional user agent string.
   * @returns The consent record.
   */
  async recordConsent(
    userId: string,
    termsVersionId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsentDto> {
    try {
      // Verify the terms version exists
      const termsVersion =
        await this.termsVersionModel.findById(termsVersionId);
      if (!termsVersion) {
        throw new HttpException(
          'Terms version not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Upsert to make it idempotent
      const consent = await this.userConsentModel.findOneAndUpdate(
        { user: userId, termsVersion: termsVersionId },
        {
          $setOnInsert: {
            user: userId,
            termsVersion: termsVersionId,
            acceptedAt: new Date(),
            ipAddress,
            userAgent,
          },
        },
        { upsert: true, new: true },
      );

      return plainToClass(UserConsentDto, consent.toObject());
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to record consent: ${msg}`, stack);
      throw new HttpException(
        'Error recording consent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Record bulk consent for all active terms for a locale.
   * Designed for the registration flow.
   * @param userId The user ID.
   * @param locale The locale to use for finding active terms.
   * @param ipAddress Optional IP address.
   * @param userAgent Optional user agent string.
   * @returns Array of consent records.
   */
  async recordBulkConsent(
    userId: string,
    locale: TermsLocale,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsentDto[]> {
    try {
      const activeTerms = await this.termsVersionModel.find({
        isActive: true,
        locale,
      });

      const consents: UserConsentDto[] = [];
      for (const term of activeTerms) {
        const consent = await this.recordConsent(
          userId,
          term.id,
          ipAddress,
          userAgent,
        );
        consents.push(consent);
      }

      return consents;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to record bulk consent: ${msg}`, stack);
      throw new HttpException(
        'Error recording bulk consent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a user has accepted all current active terms for a locale.
   * @param userId The user ID.
   * @param locale The locale to check.
   * @returns Consent status with pending and accepted lists.
   */
  async getConsentStatus(
    userId: string,
    locale: TermsLocale,
  ): Promise<ConsentStatusDto> {
    try {
      const activeTerms = await this.termsVersionModel.find({
        isActive: true,
        locale,
      });

      const userConsents = await this.userConsentModel.find({
        user: userId,
        termsVersion: { $in: activeTerms.map((t) => t.id) },
      });

      const acceptedTermsIds = new Set(
        userConsents.map((c) => c.termsVersion.id || c.termsVersion.toString()),
      );

      const pending: TermsVersionDto[] = [];
      const accepted: TermsVersionDto[] = [];

      for (const term of activeTerms) {
        const termDto = plainToClass(TermsVersionDto, term.toObject());
        if (acceptedTermsIds.has(term.id)) {
          accepted.push(termDto);
        } else {
          pending.push(termDto);
        }
      }

      return plainToClass(ConsentStatusDto, {
        allAccepted: pending.length === 0,
        pending,
        accepted,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get consent status: ${msg}`, stack);
      throw new HttpException(
        'Error getting consent status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the full consent history for a user.
   * @param userId The user ID.
   * @returns Array of consent records sorted by acceptedAt descending.
   */
  async getConsentHistory(userId: string): Promise<UserConsentDto[]> {
    try {
      const consents = await this.userConsentModel
        .find({ user: userId })
        .sort({ acceptedAt: -1 });

      return consents.map((consent) =>
        plainToClass(UserConsentDto, consent.toObject()),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get consent history: ${msg}`, stack);
      throw new HttpException(
        'Error getting consent history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
