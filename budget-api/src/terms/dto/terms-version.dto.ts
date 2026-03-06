import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { TermsType } from '../entities/terms-type.enum';
import { TermsLocale } from '../entities/terms-locale.enum';

@Exclude()
export class TermsVersionDto {
  @Expose()
  @ApiProperty({
    description: 'Terms version ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Type of legal document',
    enum: TermsType,
    example: TermsType.TOS,
  })
  type: TermsType;

  @Expose()
  @ApiProperty({
    description: 'Semantic version string',
    example: '1.0.0',
  })
  version: string;

  @Expose()
  @ApiProperty({
    description: 'Document title',
    example: 'Terms of Service',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'Full markdown content of the document',
  })
  content: string;

  @Expose()
  @ApiProperty({
    description: 'Locale of the document',
    enum: TermsLocale,
    example: TermsLocale.EN,
  })
  locale: TermsLocale;

  @Expose()
  @ApiProperty({
    description: 'When this version was published',
    example: '2026-03-01T00:00:00.000Z',
  })
  publishedAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Whether this is the current active version',
    example: true,
  })
  isActive: boolean;
}
