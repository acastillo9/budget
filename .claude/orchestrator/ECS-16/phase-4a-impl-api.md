# Backend Implementation: Receipt & Document Attachments for Transactions

## Created Files
- `budget-api/src/attachments/entities/attachment.entity.ts` — Attachment Mongoose schema with fields: filename, s3Key, mimeType, size, transaction, user, workspace (extends AuditableSchema)
- `budget-api/src/attachments/dto/attachment.dto.ts` — Response DTO with Swagger decorators for attachment data
- `budget-api/src/attachments/dto/create-attachment.dto.ts` — DTO describing the multipart file upload field for Swagger docs
- `budget-api/src/attachments/s3.service.ts` — Thin wrapper around @aws-sdk/client-s3 with upload(), delete(), and getPresignedUrl() methods
- `budget-api/src/attachments/attachments.service.ts` — Business logic: create (with validation for MIME type, max count), findAllByTransaction, getDownloadUrl, remove, removeAllByTransaction, countByTransactions
- `budget-api/src/attachments/attachments.controller.ts` — REST endpoints: POST upload, GET list, GET presigned URL, DELETE; uses FileInterceptor with 5MB limit and MIME type filter; Roles guard for CONTRIBUTOR/OWNER on write operations
- `budget-api/src/attachments/attachments.module.ts` — NestJS module registering Attachment schema, controller, services; exports AttachmentsService
- `budget-api/src/i18n/en/attachments.json` — English i18n translations for attachment error messages
- `budget-api/src/i18n/es/attachments.json` — Spanish i18n translations for attachment error messages

## Modified Files
- `budget-api/package.json` — Added @aws-sdk/client-s3, @aws-sdk/s3-request-presigner to dependencies; @types/multer to devDependencies
- `budget-api/src/app.module.ts` — Imported and registered AttachmentsModule
- `budget-api/src/transactions/transactions.module.ts` — Imported AttachmentsModule for cascade-delete access
- `budget-api/src/transactions/transactions.service.ts` — Injected AttachmentsService; added cascade-delete calls in remove() and removeTransfer() methods
- `budget-api/src/transactions/dto/transaction.dto.ts` — Added optional attachmentCount field with Swagger decorator

## Lint Status
Not run — shell command execution was restricted. User must run `cd budget-api && npm run lint` manually. Code follows existing codebase conventions (single quotes, trailing commas, Prettier formatting).

## Notes
- User must run `npm install` from the repo root to install the new @aws-sdk dependencies.
- The following environment variables must be added to `.env`: `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
