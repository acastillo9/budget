# Design: Receipt & Document Attachments for Transactions

## Overview

This feature adds the ability for users to attach proof-of-purchase documents (receipts, invoices, PDFs) to transactions. It introduces a new `Attachments` module in the NestJS API with AWS S3 as the storage backend, extends the existing `Transaction` entity with an array of attachment references, and updates the SvelteKit frontend to support file upload, preview, and deletion within the transaction creation/editing workflow. The design leverages the existing `TransactionsModule` patterns (controller/service/entity/DTO), the global auth guard stack (JWT + Workspace + Roles), and the UI form action/proxy route conventions already established in the codebase.

---

## API Changes

### New Modules

#### AttachmentsModule
- **Purpose:** Encapsulates S3 file operations and attachment CRUD logic for transactions.
- **Path:** `budget-api/src/attachments/`
- **Files:**
  - `attachments.module.ts`
  - `attachments.controller.ts`
  - `attachments.service.ts`
  - `entities/attachment.entity.ts`
  - `dto/attachment.dto.ts`
  - `dto/create-attachment.dto.ts`
  - `s3.service.ts` — thin wrapper around `@aws-sdk/client-s3` for upload/delete/presigned-URL operations

#### S3 Configuration
- Add S3-related env vars to `ConfigModule` (already global):
  - `AWS_S3_BUCKET`
  - `AWS_S3_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

### Modified Modules

#### TransactionsModule
- Import `AttachmentsModule` to access `AttachmentsService`.
- `TransactionsService.remove()` and `removeTransfer()` updated to cascade-delete attachments from S3 when a transaction is deleted.

---

### Endpoints

| Method | Path | Description | Auth | Request DTO | Response DTO |
|--------|------|-------------|------|-------------|--------------|
| `POST` | `/transactions/:transactionId/attachments` | Upload a file attachment to a transaction | JWT + Workspace + CONTRIBUTOR/OWNER | `multipart/form-data` (file field: `file`) | `AttachmentDto` |
| `GET` | `/transactions/:transactionId/attachments` | List all attachments for a transaction | JWT + Workspace | - | `AttachmentDto[]` |
| `GET` | `/transactions/:transactionId/attachments/:attachmentId` | Get a presigned download URL for an attachment | JWT + Workspace | - | `{ url: string }` |
| `DELETE` | `/transactions/:transactionId/attachments/:attachmentId` | Delete an attachment (S3 + DB) | JWT + Workspace + CONTRIBUTOR/OWNER | - | `AttachmentDto` |

---

### Entities/Schemas

#### Attachment (new)

```typescript
@Schema()
export class Attachment {
  @Prop({ type: String, required: true })
  filename: string;            // Original filename from upload

  @Prop({ type: String, required: true })
  s3Key: string;               // S3 object key (e.g., "workspaces/{wsId}/transactions/{txId}/{uuid}.ext")

  @Prop({ type: String, required: true })
  mimeType: string;            // e.g., "image/jpeg", "application/pdf"

  @Prop({ type: Number, required: true })
  size: number;                // File size in bytes

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Transaction',
    required: true,
  })
  transaction: TransactionDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  user: UserDocument;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Workspace',
  })
  workspace?: WorkspaceDocument;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const AttachmentSchema =
  SchemaFactory.createForClass(Attachment).add(AuditableSchema);
```

#### Transaction (modified)

No schema changes are needed. Attachments are stored in a separate collection referencing the transaction via `transaction` field. The `TransactionDto` response will be extended with an `attachments` count or array depending on context.

##### TransactionDto (modified)

```typescript
// Add to existing TransactionDto:
@ApiPropertyOptional({
  description: 'Number of attachments on this transaction',
  example: 2,
})
attachmentCount?: number;
```

---

### Services

#### S3Service (new)
- **Path:** `budget-api/src/attachments/s3.service.ts`
- **Methods:**
  - `upload(key: string, buffer: Buffer, mimeType: string): Promise<string>` — uploads buffer to S3, returns the S3 key
  - `delete(key: string): Promise<void>` — deletes object from S3
  - `getPresignedUrl(key: string, expiresIn?: number): Promise<string>` — generates a time-limited presigned GET URL (default 15 min)

#### AttachmentsService (new)
- **Path:** `budget-api/src/attachments/attachments.service.ts`
- **Methods:**
  - `create(transactionId: string, file: Express.Multer.File, userId: string, workspaceId: string): Promise<AttachmentDto>` — validates file, uploads to S3 with key `workspaces/{wsId}/transactions/{txId}/{uuid}{ext}`, creates Attachment document
  - `findAllByTransaction(transactionId: string, workspaceId: string): Promise<AttachmentDto[]>` — lists all attachments for a transaction
  - `getDownloadUrl(attachmentId: string, transactionId: string, workspaceId: string): Promise<{ url: string }>` — returns presigned URL
  - `remove(attachmentId: string, transactionId: string, workspaceId: string): Promise<AttachmentDto>` — deletes from S3 and DB
  - `removeAllByTransaction(transactionId: string, workspaceId: string): Promise<void>` — bulk delete all attachments for a transaction (used on transaction deletion)

#### TransactionsService (modified)
- `remove()` — after deleting the transaction, call `attachmentsService.removeAllByTransaction(id, workspaceId)` within the same DB transaction session
- `removeTransfer()` — call `removeAllByTransaction()` for both linked transactions

---

### Validation Rules

- **Max file size:** 5 MB (enforced via Multer `limits.fileSize`)
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- **Max attachments per transaction:** 5 (enforced at service level)
- **File interceptor:** `@UseInterceptors(FileInterceptor('file'))` with `fileFilter` for MIME type validation

---

## UI Changes

### New/Modified Routes

#### No new page routes needed
The attachment functionality is embedded within the existing transaction creation/editing dialogs and the transaction list/item components. No separate `/attachments` page is required.

### Modified Routes

#### `(app)/transactions/+page.server.ts`
- No changes to the page server load — attachments load inline with transaction data via the existing API call (attachment count added to `TransactionDto`).
- No new form actions — file uploads will be handled via client-side `fetch` to the API proxy route (not form actions) because `multipart/form-data` with file blobs requires a different flow than superforms.

---

### API Proxy Routes

| Proxy Route | Method | Upstream API Endpoint |
|-------------|--------|----------------------|
| `/api/transactions/[transactionId]/attachments` | `POST` | `POST /transactions/:transactionId/attachments` |
| `/api/transactions/[transactionId]/attachments` | `GET` | `GET /transactions/:transactionId/attachments` |
| `/api/transactions/[transactionId]/attachments/[attachmentId]` | `GET` | `GET /transactions/:transactionId/attachments/:attachmentId` |
| `/api/transactions/[transactionId]/attachments/[attachmentId]` | `DELETE` | `DELETE /transactions/:transactionId/attachments/:attachmentId` |

**Implementation files:**
- `budget-ui/src/routes/api/transactions/[transactionId]/attachments/+server.ts` — handles `GET` (list) and `POST` (upload, forwards `multipart/form-data` body)
- `budget-ui/src/routes/api/transactions/[transactionId]/attachments/[attachmentId]/+server.ts` — handles `GET` (presigned URL) and `DELETE`

The `POST` proxy route will forward the raw request body with `Content-Type: multipart/form-data` to the backend. The `handleFetch` hook in `hooks.server.ts` will automatically attach JWT and workspace headers.

---

### Components

#### `file-upload-zone.svelte` (new)
- **Purpose:** Reusable drag-and-drop file upload area with file browser fallback.
- **Path:** `budget-ui/src/lib/components/file-upload-zone.svelte`
- **Props:**
  ```typescript
  {
    accept: string;         // e.g., "image/jpeg,image/png,application/pdf"
    maxSize: number;        // max file size in bytes (5242880 = 5MB)
    disabled?: boolean;     // disable upload interactions
    uploading?: boolean;    // show loading state
  }
  ```
- **Events:** `onFileSelect(file: File)` — emitted when a valid file is selected
- **Behavior:** Validates file type and size client-side before emitting. Shows drag hover state, file type hints, and size limit info.

#### `attachment-list.svelte` (new)
- **Purpose:** Displays list of attachments on a transaction with preview/download and delete actions.
- **Path:** `budget-ui/src/lib/components/attachment-list.svelte`
- **Props:**
  ```typescript
  {
    attachments: Attachment[];
    transactionId: string;
    editable?: boolean;
  }
  ```
- **Events:** `onDelete(attachment: Attachment)` — emitted when delete is confirmed
- **Behavior:** Shows filename, file type icon (image vs PDF), file size. Click opens presigned URL in new tab. Delete button with confirmation.

#### `attachment-thumbnail.svelte` (new)
- **Purpose:** Small inline thumbnail/icon for an attachment (used in transaction item and attachment list).
- **Path:** `budget-ui/src/lib/components/attachment-thumbnail.svelte`
- **Props:**
  ```typescript
  {
    attachment: Attachment;
    size?: 'sm' | 'md';   // default 'sm'
  }
  ```
- **Behavior:** For images, shows a small thumbnail (presigned URL). For PDFs, shows a file icon with "PDF" label.

#### `create-transaction-form.svelte` (modified)
- **Path:** `budget-ui/src/lib/components/create-transaction-wizard/create-transaction-form.svelte`
- **Changes:** Add `file-upload-zone` below the notes field when editing an existing transaction. New attachments are uploaded immediately via fetch to the proxy route. Shows uploaded attachments inline with delete capability.

#### `create-transfer-form.svelte` (modified)
- **Path:** `budget-ui/src/lib/components/create-transaction-wizard/create-transfer-form.svelte`
- **Changes:** Same attachment upload zone as the transaction form (when editing).

#### `transaction-item.svelte` (modified)
- **Path:** `budget-ui/src/lib/components/transaction-item.svelte`
- **Changes:** Show a small paperclip icon with attachment count badge when `transaction.attachmentCount > 0`.

---

### Types

#### `Attachment` type (new)
- **Path:** `budget-ui/src/lib/types/transactions.types.ts` (extend existing file)

```typescript
export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};
```

#### `Transaction` type (modified)
- Add `attachmentCount?: number` to existing `Transaction` type.

---

### State Management

No new global stores are needed. Attachment state is local to the components that manage it:

- **In `create-transaction-form.svelte` / `create-transfer-form.svelte`:** Local `$state` array of `Attachment[]` fetched when editing an existing transaction. Upload and delete operations update this local array and trigger refetch.
- **In `transaction-item.svelte`:** Uses the `attachmentCount` from the transaction data (already available from server load).

---

## Data Flow

### Upload Flow
1. User opens edit dialog for an existing transaction.
2. User selects or drags a file into `file-upload-zone.svelte`.
3. Component validates file type/size client-side and emits `onFileSelect(file)`.
4. `create-transaction-form.svelte` creates `FormData`, appends the file, and `fetch("POST /api/transactions/{txId}/attachments", { body: formData })`.
5. SvelteKit proxy route at `src/routes/api/transactions/[transactionId]/attachments/+server.ts` forwards the multipart request to `POST ${API_URL}/transactions/${transactionId}/attachments`.
6. `hooks.server.ts` `handleFetch` attaches `Authorization` and `X-Workspace-Id` headers.
7. NestJS `AttachmentsController.upload()` receives the request, Multer intercepts the file.
8. `AttachmentsService.create()` validates (file type, size, max count), generates S3 key, calls `S3Service.upload()`, creates `Attachment` document in MongoDB.
9. Returns `AttachmentDto` to the frontend.
10. UI updates local attachment list and shows the new attachment thumbnail.

### Download/View Flow
1. User clicks on an attachment thumbnail/link in `attachment-list.svelte`.
2. Client `fetch("GET /api/transactions/{txId}/attachments/{attachmentId}")`.
3. Proxy forwards to backend, which generates a presigned S3 URL (15 min expiry).
4. UI opens the presigned URL in a new browser tab.

### Delete Attachment Flow
1. User clicks delete button on an attachment in `attachment-list.svelte`.
2. Confirmation dialog appears.
3. On confirm, client `fetch("DELETE /api/transactions/{txId}/attachments/{attachmentId}")`.
4. Proxy forwards to backend.
5. `AttachmentsService.remove()` deletes the S3 object, then the MongoDB document.
6. Returns deleted `AttachmentDto`.
7. UI removes the attachment from the local list.

### Transaction Deletion Cascade Flow
1. User deletes a transaction (existing flow).
2. `TransactionsService.remove()` calls `AttachmentsService.removeAllByTransaction(txId, wsId)` within the DB transaction.
3. `removeAllByTransaction()` queries all attachments for the transaction, deletes each from S3, then bulk-deletes from MongoDB.
4. Transaction is deleted as before.

---

## Implementation Order

1. **Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`** in `budget-api`
   - No dependencies on other steps

2. **Create `S3Service`** (`budget-api/src/attachments/s3.service.ts`)
   - Depends on: step 1
   - Wraps S3 client with `upload()`, `delete()`, `getPresignedUrl()` methods

3. **Create `Attachment` entity** (`budget-api/src/attachments/entities/attachment.entity.ts`)
   - No dependencies

4. **Create `AttachmentDto` and `CreateAttachmentDto`** (`budget-api/src/attachments/dto/`)
   - Depends on: step 3

5. **Create `AttachmentsService`** (`budget-api/src/attachments/attachments.service.ts`)
   - Depends on: steps 2, 3, 4

6. **Create `AttachmentsController`** (`budget-api/src/attachments/attachments.controller.ts`)
   - Depends on: step 5

7. **Create `AttachmentsModule`** and register in `AppModule`
   - Depends on: steps 2-6

8. **Modify `TransactionsModule`** to import `AttachmentsModule`
   - Depends on: step 7

9. **Modify `TransactionsService`** to cascade-delete attachments on transaction deletion
   - Depends on: step 8

10. **Modify `TransactionDto`** to include `attachmentCount`
    - Depends on: step 7

11. **Modify `TransactionsService.findAll()`** to aggregate attachment counts
    - Depends on: step 10

12. **Add env vars** to `.env.example` and `.env` files
    - No code dependencies, should be done with step 1

13. **Create migration** to add indexes on `Attachment` collection (`transaction` + `workspace` compound index)
    - Depends on: step 3

14. **Add `Attachment` type** to `budget-ui/src/lib/types/transactions.types.ts`
    - No backend dependency

15. **Modify `Transaction` type** to add `attachmentCount`
    - No backend dependency

16. **Create API proxy routes** for attachments in `budget-ui/src/routes/api/transactions/[transactionId]/attachments/`
    - Depends on: steps 7 (backend endpoints exist), 14

17. **Create `file-upload-zone.svelte` component**
    - No dependencies

18. **Create `attachment-thumbnail.svelte` component**
    - Depends on: step 14

19. **Create `attachment-list.svelte` component**
    - Depends on: steps 16, 17, 18

20. **Modify `create-transaction-form.svelte`** to integrate attachment upload/list
    - Depends on: steps 16, 19

21. **Modify `create-transfer-form.svelte`** to integrate attachment upload/list
    - Depends on: steps 16, 19

22. **Modify `transaction-item.svelte`** to show attachment count indicator
    - Depends on: step 15

23. **Add i18n keys** to both `en.json` and `es.json` locale files
    - Should be done alongside UI work (steps 17-22)

---

## i18n Keys

### English (`en.json`)

```json
{
  "transactions": {
    "attachments": {
      "title": "Attachments",
      "uploadReceipt": "Attach Receipt",
      "dragAndDrop": "Drag and drop a file here, or click to browse",
      "supportedFormats": "Supported: JPG, PNG, WebP, PDF (max 5MB)",
      "uploading": "Uploading...",
      "uploadSuccess": "Attachment uploaded successfully.",
      "uploadError": "Error uploading attachment. Please try again.",
      "deleteTitle": "Delete Attachment",
      "deleteDescription": "Are you sure you want to delete \"{filename}\"? This action cannot be undone.",
      "deleteSuccess": "Attachment deleted successfully.",
      "deleteError": "Error deleting attachment. Please try again.",
      "maxAttachments": "Maximum of {max} attachments per transaction.",
      "fileTooLarge": "File is too large. Maximum size is {maxSize}MB.",
      "unsupportedType": "Unsupported file type. Please upload a JPG, PNG, WebP, or PDF.",
      "count": "{count} attachment | {count} attachments"
    }
  }
}
```

### Spanish (`es.json`)

```json
{
  "transactions": {
    "attachments": {
      "title": "Adjuntos",
      "uploadReceipt": "Adjuntar Recibo",
      "dragAndDrop": "Arrastra y suelta un archivo aqui, o haz clic para buscar",
      "supportedFormats": "Formatos: JPG, PNG, WebP, PDF (max 5MB)",
      "uploading": "Subiendo...",
      "uploadSuccess": "Adjunto subido exitosamente.",
      "uploadError": "Error al subir el adjunto. Por favor intenta de nuevo.",
      "deleteTitle": "Eliminar Adjunto",
      "deleteDescription": "Estas seguro que deseas eliminar \"{filename}\"? Esta accion no se puede deshacer.",
      "deleteSuccess": "Adjunto eliminado exitosamente.",
      "deleteError": "Error al eliminar el adjunto. Por favor intenta de nuevo.",
      "maxAttachments": "Maximo de {max} adjuntos por transaccion.",
      "fileTooLarge": "El archivo es muy grande. El tamano maximo es {maxSize}MB.",
      "unsupportedType": "Tipo de archivo no soportado. Por favor sube un JPG, PNG, WebP o PDF.",
      "count": "{count} adjunto | {count} adjuntos"
    }
  }
}
```

### API i18n (backend validation messages)

Add to `budget-api/src/i18n/en/` and `budget-api/src/i18n/es/` if validation error messages need to be localized (currently the API i18n is only used for email templates). For now, English-only error messages in the service layer are acceptable, matching the existing pattern.

---

## Edge Cases & Validation

### Input Validation Rules

| Rule | Where Enforced | Behavior |
|------|---------------|----------|
| File size <= 5MB | Multer `limits.fileSize` (API) + client-side check (UI) | API: 400 Bad Request with `PayloadTooLargeException`. UI: prevents upload, shows error. |
| MIME type in allowed list | Multer `fileFilter` (API) + client-side check (UI) | API: 400 Bad Request. UI: prevents upload, shows error. |
| Max 5 attachments per transaction | `AttachmentsService.create()` | API: 400 Bad Request with descriptive message. UI: hides upload zone when limit reached. |
| Transaction must exist and belong to workspace | `AttachmentsService` (all methods) | API: 404 Not Found. |
| Attachment must exist and belong to transaction | `AttachmentsService.remove()`, `getDownloadUrl()` | API: 404 Not Found. |
| User must have CONTRIBUTOR or OWNER role | `@Roles()` decorator on POST/DELETE endpoints | API: 403 Forbidden. |
| S3 upload failure | `S3Service.upload()` | API: 500 Internal Server Error. DB record is NOT created (operation order: upload to S3 first, then save to DB). |
| S3 delete failure | `S3Service.delete()` | Log error but do not fail the DB deletion — orphaned S3 objects are acceptable and can be cleaned up via lifecycle rules. |
| Empty file | Multer + service layer | API: 400 Bad Request. |
| Concurrent uploads to same transaction | No special handling needed — each attachment gets a UUID-based S3 key. |
| Transaction deletion with attachments | `TransactionsService.remove()` cascades via `AttachmentsService.removeAllByTransaction()` | S3 objects deleted in batch, then DB records deleted. If S3 delete partially fails, DB records are still deleted (log warnings). |
| Transfer deletion with attachments | Both linked transactions' attachments are deleted. |
| File with manipulated extension | MIME type check uses the actual file buffer (Multer), not just the extension. |
| Presigned URL expiration | URLs expire after 15 minutes. UI should re-fetch URL on click rather than caching. |

### Error Scenarios

1. **Network failure during upload:** Client-side timeout or error. UI shows error toast, no DB or S3 state change.
2. **S3 bucket permission error:** Service catches AWS error, returns 500. Transaction record unmodified.
3. **DB save failure after S3 upload:** Service should attempt S3 cleanup (delete the just-uploaded object). If cleanup fails, the orphaned object is acceptable.
4. **User uploads while another upload is in progress:** UI disables the upload zone during active upload to prevent this.
5. **Transaction deleted while viewing attachments:** Next attachment operation returns 404. UI should handle gracefully.
