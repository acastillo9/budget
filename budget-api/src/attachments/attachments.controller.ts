import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { AttachmentDto } from './dto/attachment.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { Roles } from 'src/workspaces/decorators/roles.decorator';
import { WorkspaceRole } from 'src/workspaces/entities/workspace-role.enum';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './attachments.constants';

@ApiTags('Attachments')
@ApiBearerAuth('JWT')
@Controller('transactions/:transactionId/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @ApiOperation({ summary: 'Upload an attachment to a transaction' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded',
    type: AttachmentDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new HttpException(
              'Unsupported file type. Allowed: JPG, PNG, WebP, PDF.',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  upload(
    @Request() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.attachmentsService.create(
      transactionId,
      file,
      req.user.userId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'List all attachments for a transaction' })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'List of attachments',
    type: [AttachmentDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
  ) {
    return this.attachmentsService.findAllByTransaction(
      transactionId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({
    summary: 'Get a presigned download URL for an attachment',
  })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned download URL',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @Get(':attachmentId')
  getDownloadUrl(
    @Request() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attachmentsService.getDownloadUrl(
      attachmentId,
      transactionId,
      req.user.workspaceId,
    );
  }

  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiParam({
    name: 'transactionId',
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: '507f1f77bcf86cd799439012',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment deleted',
    type: AttachmentDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  @Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)
  @Delete(':attachmentId')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attachmentsService.remove(
      attachmentId,
      transactionId,
      req.user.workspaceId,
    );
  }
}
