import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TermsLocale } from '../entities/terms-locale.enum';

export class ActiveTermsQueryDto {
  @ApiPropertyOptional({
    description: 'Locale for the terms content',
    enum: TermsLocale,
    default: TermsLocale.EN,
  })
  @IsOptional()
  @IsEnum(TermsLocale)
  locale?: TermsLocale = TermsLocale.EN;
}
