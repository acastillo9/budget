# Epic: ECS-16 — Receipt & Document Attachments for Transactions

## Description
To provide better financial record-keeping, users need the ability to attach proof of purchase (receipts, invoices, contracts) directly to their transactions. This Epic covers setting up the cloud storage infrastructure (AWS S3), creating the backend endpoints to handle secure file uploads, and updating the frontend UI so users can easily upload, view, and manage these documents.

## Stories & Tasks

### ECS-17 — Cloud Storage Infrastructure & Upload API
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Set up the AWS S3 infrastructure and create a new NestJS endpoint that accepts `multipart/form-data`. The backend will use Multer to intercept the file, validate its type and size, upload it to S3, and return the secure file URL to be stored in the database.
- **Acceptance Criteria:**
  - Given an authenticated user makes a POST request to `/api/transactions/:id/attachments` with a valid image or PDF, When the server processes the request, Then the file is uploaded to the S3 bucket and the `attachmentUrl` is saved to the corresponding transaction in the database.
  - Given a user attempts to upload a file larger than 5MB or an unsupported type (e.g., `.exe`), When the request hits the server, Then the API rejects the request with a `400 Bad Request` and a descriptive error message.
  - Given an S3 upload fails due to network or permission issues, When the service attempts the upload, Then the transaction database record remains unmodified and a `500 Internal Server Error` is returned to the client.

### ECS-18 — Frontend Upload UI & Transaction Form Integration
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Update the transaction forms in the SvelteKit UI. Add a drag-and-drop file input zone or a simple file browser button. The UI needs to handle the upload state gracefully, showing loading indicators while the file is being transmitted to the backend.
- **Acceptance Criteria:**
  - Given I am creating or editing a transaction, When I click the "Attach Receipt" area, Then my OS file browser opens, allowing me to select a `.jpg`, `.png`, or `.pdf` file.
  - Given I have selected a file, When the upload begins, Then the UI displays a loading spinner or progress bar and disables the "Save" button until the upload completes.
  - Given an upload is successful, When the server responds, Then the UI shows a small thumbnail or file icon representing the attached document.

### ECS-19 — Viewing & Deleting Attachments
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Now that files can be attached, users need a way to interact with them on the transaction details view. If a user deletes a transaction, or manually removes an attachment, the backend must also clean up the file from the AWS S3 bucket to prevent orphaned files and unnecessary storage costs.
- **Acceptance Criteria:**
  - Given a transaction has an attachment, When I view its details on the dashboard, Then I see a clickable link or thumbnail to view/download the receipt.
  - Given I am editing a transaction with an existing attachment, When I click the "Remove Attachment" button, Then the UI prompts for confirmation.
  - Given I confirm the deletion of an attachment, When the request completes, Then the file is deleted from the S3 bucket, the `attachmentUrl` is cleared from the database, and the UI updates immediately.
  - Given I delete a transaction entirely, When the backend processes the deletion, Then it automatically deletes any associated files in S3.

## Stats
- Total issues: 3
- By type: 3 stories, 0 tasks, 0 subtasks
- By status: 3 Backlog (To Do), 0 In Progress, 0 Done
