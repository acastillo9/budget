import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { TermsVersionDto } from './terms-version.dto';

@Exclude()
export class ConsentStatusDto {
  @Expose()
  @ApiProperty({
    description: 'Whether the user has accepted all current active terms',
    example: true,
  })
  allAccepted: boolean;

  @Expose()
  @ApiProperty({
    description: 'Terms versions the user has not yet accepted',
    type: [TermsVersionDto],
  })
  @Type(() => TermsVersionDto)
  pending: TermsVersionDto[];

  @Expose()
  @ApiProperty({
    description: 'Terms versions the user has already accepted',
    type: [TermsVersionDto],
  })
  @Type(() => TermsVersionDto)
  accepted: TermsVersionDto[];
}
