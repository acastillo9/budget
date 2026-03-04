import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Model } from 'mongoose';
import { Attachment } from './entities/attachment.entity';
import { AttachmentDto } from './dto/attachment.dto';
import { S3Service } from './s3.service';
import { plainToClass } from 'class-transformer';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { I18nService } from 'nestjs-i18n';
import {
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENTS_PER_TRANSACTION,
} from './attachments.constants';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    @InjectModel(Attachment.name)
    private readonly attachmentModel: Model<Attachment>,
    private readonly s3Service: S3Service,
    private readonly i18n: I18nService,
  ) {}

  async create(
    transactionId: string,
    file: Express.Multer.File,
    userId: string,
    workspaceId: string,
  ): Promise<AttachmentDto> {
    if (!file || file.size === 0) {
      throw new HttpException(
        this.i18n.t('attachments.fileRequired'),
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new HttpException(
        this.i18n.t('attachments.unsupportedType'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingCount = await this.attachmentModel.countDocuments({
      transaction: transactionId,
      workspace: workspaceId,
    });

    if (existingCount >= MAX_ATTACHMENTS_PER_TRANSACTION) {
      throw new HttpException(
        this.i18n.t('attachments.maxAttachments', {
          args: { max: MAX_ATTACHMENTS_PER_TRANSACTION },
        }),
        HttpStatus.BAD_REQUEST,
      );
    }

    const sanitizedFilename = path.basename(file.originalname);
    const ext = path.extname(sanitizedFilename) || '';
    const s3Key = `workspaces/${workspaceId}/transactions/${transactionId}/${randomUUID()}${ext}`;

    try {
      await this.s3Service.upload(s3Key, file.buffer, file.mimetype);
    } catch (error) {
      this.logger.error(
        `Failed to upload file to S3: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        this.i18n.t('attachments.uploadError'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const attachment = new this.attachmentModel({
        filename: sanitizedFilename,
        s3Key,
        mimeType: file.mimetype,
        size: file.size,
        transaction: transactionId,
        user: userId,
        workspace: workspaceId,
      });

      const saved = await attachment.save();
      return plainToClass(AttachmentDto, saved.toObject());
    } catch (error) {
      // Attempt to clean up the S3 object if DB save fails
      await this.s3Service.delete(s3Key);
      this.logger.error(
        `Failed to save attachment record: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        this.i18n.t('attachments.uploadError'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByTransaction(
    transactionId: string,
    workspaceId: string,
  ): Promise<AttachmentDto[]> {
    try {
      const attachments = await this.attachmentModel.find({
        transaction: transactionId,
        workspace: workspaceId,
      });
      return attachments.map((a) => plainToClass(AttachmentDto, a.toObject()));
    } catch (error) {
      this.logger.error(
        `Failed to find attachments: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding attachments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDownloadUrl(
    attachmentId: string,
    transactionId: string,
    workspaceId: string,
  ): Promise<{ url: string }> {
    const attachment = await this.attachmentModel.findOne({
      _id: attachmentId,
      transaction: transactionId,
      workspace: workspaceId,
    });

    if (!attachment) {
      throw new HttpException(
        this.i18n.t('attachments.notFound'),
        HttpStatus.NOT_FOUND,
      );
    }

    const url = await this.s3Service.getPresignedUrl(attachment.s3Key);
    return { url };
  }

  async remove(
    attachmentId: string,
    transactionId: string,
    workspaceId: string,
  ): Promise<AttachmentDto> {
    const attachment = await this.attachmentModel.findOneAndDelete({
      _id: attachmentId,
      transaction: transactionId,
      workspace: workspaceId,
    });

    if (!attachment) {
      throw new HttpException(
        this.i18n.t('attachments.notFound'),
        HttpStatus.NOT_FOUND,
      );
    }

    await this.s3Service.delete(attachment.s3Key);
    return plainToClass(AttachmentDto, attachment.toObject());
  }

  async removeAllByTransaction(
    transactionId: string,
    workspaceId: string,
    session?: ClientSession,
  ): Promise<string[]> {
    const attachments = await this.attachmentModel.find({
      transaction: transactionId,
      workspace: workspaceId,
    });

    const s3Keys = attachments.map((a) => a.s3Key);

    await this.attachmentModel.deleteMany(
      {
        transaction: transactionId,
        workspace: workspaceId,
      },
      session ? { session } : undefined,
    );

    return s3Keys;
  }

  async deleteS3Objects(s3Keys: string[]): Promise<void> {
    await Promise.all(s3Keys.map((key) => this.s3Service.delete(key)));
  }

  async countByTransactions(
    transactionIds: string[],
    workspaceId: string,
  ): Promise<Map<string, number>> {
    const counts = await this.attachmentModel.aggregate([
      {
        $match: {
          transaction: {
            $in: transactionIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          workspace: new mongoose.Types.ObjectId(workspaceId),
        },
      },
      {
        $group: {
          _id: '$transaction',
          count: { $sum: 1 },
        },
      },
    ]);

    const map = new Map<string, number>();
    for (const item of counts) {
      map.set(item._id.toString(), item.count);
    }
    return map;
  }
}
