import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { TermsVersionDto } from './terms-version.dto';

@Exclude()
export class UserConsentDto {
  @Expose()
  @ApiProperty({
    description: 'Consent record ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'The terms version that was accepted',
    type: TermsVersionDto,
  })
  @Type(() => TermsVersionDto)
  termsVersion: TermsVersionDto;

  @Expose()
  @ApiProperty({
    description: 'When the user accepted the terms',
    example: '2026-03-01T00:00:00.000Z',
  })
  acceptedAt: Date;

  ipAddress?: string;

  userAgent?: string;
}
