import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { S3Service } from './s3.service';
import { Attachment, AttachmentSchema } from './entities/attachment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attachment.name, schema: AttachmentSchema },
    ]),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, S3Service],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
