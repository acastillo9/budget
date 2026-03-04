# Documentation: Receipt & Document Attachments for Transactions

## Created Diagrams
- budget-api/docs/class-diagram.attachments-design.md — Class diagram showing Attachment entity, DTOs (AttachmentDto, CreateAttachmentDto), services (S3Service, AttachmentsService, AttachmentsController), enumerations (AllowedMimeType), and relationships to existing Transaction/User/Workspace entities
- budget-api/docs/sequence-diagram.attachment-upload-flow.md — Sequence diagram showing the end-to-end file upload flow from user interaction through SvelteKit UI, API proxy, auth guards, Multer processing, AttachmentsService validation, S3 upload, MongoDB persistence, and success/error responses
- budget-api/docs/er-diagram.attachments-design.md — ER diagram showing the new Attachment collection with its foreign key relationships to Transaction, User, and Workspace collections
