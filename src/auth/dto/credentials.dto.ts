import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CredentialsDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiPropertyOptional({
    description: 'JWT refresh token (included on login and registration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token?: string;
}
