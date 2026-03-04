import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AttachmentDto {
  @Expose()
  @ApiProperty({
    description: 'Attachment ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Original filename',
    example: 'receipt.jpg',
  })
  filename: string;

  @Expose()
  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  mimeType: string;

  @Expose()
  @ApiProperty({
    description: 'File size in bytes',
    example: 245760,
  })
  size: number;

  @Expose()
  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2025-06-15T10:30:00.000Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2025-06-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
