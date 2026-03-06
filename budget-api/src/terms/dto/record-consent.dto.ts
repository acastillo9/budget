import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class RecordConsentDto {
  @ApiProperty({
    description: 'ID of the terms version being accepted',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  termsVersionId: string;
}
