# Advanced Patterns

Patterns for file uploads, external service integration, and cascade deletes with deferred cleanup.

---

## File Upload Controller Pattern

Use `FileInterceptor` from `@nestjs/platform-express` for multipart uploads. Define allowed MIME types and size limits in a constants file.

### Constants File (`attachments.constants.ts`)

```typescript
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const MAX_ATTACHMENTS_PER_TRANSACTION = 5;
```

### Controller Pattern

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './attachments.constants';

@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
})
@Post()
@UseInterceptors(
  FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, callback) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(
          new HttpException('Unsupported file type', HttpStatus.BAD_REQUEST),
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
  return this.service.create(transactionId, file, req.user.userId, req.user.workspaceId);
}
```

Rules:
- `@ApiConsumes('multipart/form-data')` + `@ApiBody` with binary schema for Swagger
- `FileInterceptor('file', { limits, fileFilter })` — validate MIME type in `fileFilter`
- `@UploadedFile() file: Express.Multer.File` to receive the file
- Extract constants (MIME types, size limits, max count) into a `*.constants.ts` file
- Reject invalid types with `HttpException(BAD_REQUEST)` inside `fileFilter` callback

Source: `budget-api/src/attachments/attachments.controller.ts`

---

## External Service Wrapper Pattern

Wrap external SDK clients (S3, email providers, etc.) in an `@Injectable()` service. Use `ConfigService.getOrThrow()` in the constructor for mandatory environment variables — this fails fast at startup if misconfigured.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    // Fail-fast: getOrThrow() crashes at startup if env var is missing
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    const region = this.configService.getOrThrow<string>('AWS_S3_REGION');
    const accessKeyId = this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> { /* ... */ }
  async delete(key: string): Promise<void> { /* warn on failure, don't throw */ }
  async getPresignedUrl(key: string, expiresIn?: number): Promise<string> { /* ... */ }
}
```

Rules:
- `ConfigService.getOrThrow()` in constructor for mandatory config — not `get()` at runtime
- Initialize the SDK client once in the constructor, store as `private readonly`
- `Logger` instance for warning/error logging
- Wrap `delete()` in try/catch and **warn** instead of throwing — external cleanup is best-effort
- Keep the wrapper thin: expose only the methods the app needs (upload, delete, getPresignedUrl)
- Register in the feature module's `providers` array; export if needed by other modules

Source: `budget-api/src/attachments/s3.service.ts`

---

## Cascade Delete with Deferred External Cleanup

When deleting a parent entity that has children with external resources (e.g., S3 objects), use this two-phase pattern:

1. **Inside the DB session**: delete all DB records, collect external resource keys
2. **After session commit**: delete external resources (best-effort)

```typescript
async remove(id: string, userId: string, workspaceId: string): Promise<Dto> {
  const entity = await this.findOne(id, workspaceId);

  const removeFn = async (session: ClientSession) => {
    // 1. Reverse side effects (e.g., account balance)
    await this.accountsService.addAccountBalance(entity.account.id, -entity.amount, session);

    // 2. Delete parent record
    const deleted = await this.model.findOneAndDelete(
      { _id: id, workspace: workspaceId },
      { session },
    );
    if (!deleted) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

    // 3. Delete child DB records, collect external keys
    const s3Keys = await this.attachmentsService.removeAllByTransaction(id, workspaceId, session);

    return { dto: plainToClass(Dto, deleted.toObject()), s3Keys };
  };

  const result = await this.dbTransactionService.runTransaction(removeFn);

  // 4. AFTER session commit: delete external resources (best-effort)
  await this.attachmentsService.deleteS3Objects(result.s3Keys);

  return result.dto;
}
```

The child service exposes two methods for this pattern:

```typescript
// Returns S3 keys for deferred deletion; deletes DB records inside session
async removeAllByTransaction(transactionId: string, workspaceId: string, session?: ClientSession): Promise<string[]> {
  const attachments = await this.model.find({ transaction: transactionId, workspace: workspaceId });
  const s3Keys = attachments.map((a) => a.s3Key);
  await this.model.deleteMany(
    { transaction: transactionId, workspace: workspaceId },
    session ? { session } : undefined,
  );
  return s3Keys;
}

// Best-effort external cleanup — called AFTER DB commit
async deleteS3Objects(s3Keys: string[]): Promise<void> {
  await Promise.all(s3Keys.map((key) => this.s3Service.delete(key)));
}
```

Rules:
- **Never delete external resources inside a DB session** — if the session rolls back, external deletes cannot be undone
- Collect external resource identifiers (S3 keys, URLs, etc.) inside the session
- Delete external resources **after** the session commits successfully
- External deletion is best-effort: log warnings on failure, don't throw
- Pass `session` to all DB operations inside the transaction for atomicity
- The child `removeAll*` method accepts optional `session?: ClientSession` for composability

Source: `budget-api/src/transactions/transactions.service.ts`, `budget-api/src/attachments/attachments.service.ts`

---

## Compensation Pattern (Upload with DB Save)

When uploading to an external service then saving to DB, compensate on DB failure:

```typescript
async create(transactionId: string, file: Express.Multer.File, userId: string, workspaceId: string): Promise<Dto> {
  // 1. Upload to external service first
  const s3Key = `workspaces/${workspaceId}/transactions/${transactionId}/${randomUUID()}${ext}`;
  await this.s3Service.upload(s3Key, file.buffer, file.mimetype);

  try {
    // 2. Save DB record
    const record = new this.model({ filename, s3Key, mimeType, size, transaction, user, workspace });
    const saved = await record.save();
    return plainToClass(Dto, saved.toObject());
  } catch (error) {
    // 3. Compensate: clean up external resource if DB save fails
    await this.s3Service.delete(s3Key);
    throw new HttpException('Upload error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
```

Rules:
- Upload to external service **before** DB save (external operations can't join DB sessions)
- Wrap DB save in try/catch; on failure, delete the uploaded external resource
- Generate unique keys using `randomUUID()` to avoid collisions
- Sanitize filenames with `path.basename(file.originalname)`

Source: `budget-api/src/attachments/attachments.service.ts`
