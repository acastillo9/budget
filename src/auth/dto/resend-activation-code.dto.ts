import { ApiProperty } from '@nestjs/swagger';

export class ResendActivationCodeDto {
  @ApiProperty({
    description: 'Earliest time the activation code can be resent again',
    example: '2025-06-15T12:35:00.000Z',
  })
  activationCodeResendAt: Date;
}
