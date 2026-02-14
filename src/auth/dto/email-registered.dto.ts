import { ApiProperty } from '@nestjs/swagger';

export class EmailRegisteredDto {
  @ApiProperty({
    description: 'Whether the email is already registered',
    example: true,
  })
  registered: boolean;
}
