# Test Plan Reference

## Test Plan Structure

Present the test plan as a Markdown document for user review **before writing any test code**. This step is mandatory.

### Template

```markdown
# E2E Test Plan — [Project Name]

## Infrastructure Summary
- **ORM**: [Mongoose / TypeORM / Prisma / ...]
- **Auth**: [JWT global guard / no auth / ...]
- **Test Runner**: [Jest / Vitest]
- **Existing e2e coverage**: [None / Partial — list covered endpoints]

## Test Data Seeding Order
1. [Entity] — [why first]
2. [Entity] — [depends on #1]
...

## Test Suites

### [Controller Name] (`/route-prefix`)

#### `[METHOD] /route-prefix/path` — [brief description]
- [ ] **Happy path**: [description, expected status, key assertions]
- [ ] **Validation error**: [missing/invalid field, expected 400/422]
- [ ] **Auth required**: [no token → 401, invalid token → 401]
- [ ] **Not found**: [invalid ID → 404]
- [ ] **Edge case**: [specific scenario]

...repeat for each endpoint...

## Assumptions
- [List any assumptions made]

## Open Questions
- [Any decisions the user needs to make]
```

## Test Case Categories

For each endpoint, consider these categories:

### 1. Happy Path
- Valid request with all required fields → expected success status (200, 201)
- Response body shape matches expected structure
- Database state updated correctly (if applicable)

### 2. Validation Errors
One test per validation rule detected in the DTO:
- Missing required field → 400
- Invalid type (string where number expected) → 400
- Invalid format (malformed email, invalid MongoId) → 400
- Out-of-range values (negative where positive required, exceeds max) → 400
- Unknown properties are stripped (whitelist: true) — verify they don't appear in response

### 3. Authentication / Authorization
Only when guards are detected:
- No Authorization header → 401
- Invalid/expired token → 401
- Valid token → success
- If role-based guards exist: wrong role → 403

### 4. Not Found
For endpoints with `:id` parameters:
- Valid but non-existent ID → 404
- Invalid ID format (non-MongoId when MongoId expected) → 400

### 5. Edge Cases
- Empty body on POST/PATCH → 400
- Duplicate resource creation (if unique constraints exist)
- Deleting a resource that has dependents
- Boundary values (0, negative, very large numbers)
- Empty string vs null vs missing field

### 6. Relationship / Dependency Scenarios
- Creating a resource with a reference to a non-existent parent → 400/404
- Deleting a parent that has children (cascade behavior)
- Updating a reference to point to a different valid parent

## Naming Convention for Test Descriptions

Use BDD-style `describe` / `it` blocks:

```typescript
describe('AccountsController (e2e)', () => {
  describe('POST /accounts', () => {
    it('should create an account with valid data', ...);
    it('should return 400 when name is missing', ...);
    it('should return 401 when no auth token is provided', ...);
  });

  describe('GET /accounts', () => {
    it('should return all accounts for the authenticated user', ...);
    it('should not return accounts from other users', ...);
  });
});
```

Rules:
- `describe` block: `ControllerName (e2e)` → `METHOD /path`
- `it` block: start with `should`, describe expected behavior
- Group by endpoint, then by scenario category
