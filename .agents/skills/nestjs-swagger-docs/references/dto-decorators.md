# DTO Decorator Reference

## @ApiProperty on Input DTOs

Add `@ApiProperty()` to every property in request DTOs (Create, Update, Query DTOs). Include `description`, `example`, and type metadata.

### Mapping Validation Decorators to @ApiProperty

| Validator | @ApiProperty fields |
|---|---|
| `@IsString()` | `type: 'string'` (auto-inferred with CLI plugin) |
| `@IsNumber()` | `type: 'number'` |
| `@IsBoolean()` | `type: 'boolean'` |
| `@IsDate()` + `@Type(() => Date)` | `type: 'string', format: 'date-time'` |
| `@IsEnum(EnumType)` | `enum: EnumType, enumName: 'EnumType'` |
| `@IsMongoId()` | `type: 'string', description: '...', example: '507f1f77bcf86cd799439011'` |
| `@IsOptional()` | `required: false` |
| `@IsPositive()` | `minimum: 1` |
| `@Min(n)` | `minimum: n` |
| `@Max(n)` | `maximum: n` |
| `@IsEmail()` | `format: 'email', example: 'user@example.com'` |
| `@IsArray()` + `@IsMongoId({ each: true })` | `type: [String], example: ['507f1f77bcf86cd799439011']` |
| `@ArrayMinSize(n)` | `minItems: n` |

### Example — Input DTO

```typescript
export class CreateAccountDto {
  @ApiProperty({ description: 'Account display name', example: 'Main Checking' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Account currency', enum: CurrencyCode, example: CurrencyCode.USD })
  @IsEnum(CurrencyCode)
  currencyCode: CurrencyCode;

  @ApiProperty({ description: 'Initial balance', example: 1500.00 })
  @IsNumber()
  balance: number;

  @ApiProperty({ description: 'Account type ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  accountType: string;
}
```

### Example — Date Fields

```typescript
@ApiProperty({ description: 'Transaction date', example: '2025-06-15T00:00:00.000Z' })
@IsDate()
@Type(() => Date)
date: Date;
```

### Example — Optional Fields

```typescript
@ApiPropertyOptional({ description: 'Additional notes', example: 'Reimbursement pending' })
@IsOptional()
@IsString()
notes?: string;
```

Use `@ApiPropertyOptional()` instead of `@ApiProperty({ required: false })` for cleaner code.

### Example — Array of IDs

```typescript
@ApiProperty({
  description: 'Category IDs included in this budget',
  type: [String],
  example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
})
@IsArray()
@ArrayMinSize(1)
@IsMongoId({ each: true })
categories: string[];
```

## @ApiProperty on Output DTOs

Add `@ApiProperty()` to response DTOs so Swagger can render response schemas. Focus on `description` and `example`.

### Example — Output DTO

```typescript
export class AccountDto {
  @ApiProperty({ description: 'Account ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'Account name', example: 'Main Checking' })
  name: string;

  @ApiProperty({ description: 'Current balance', example: 2450.75 })
  balance: number;

  @ApiProperty({ description: 'Currency code', enum: CurrencyCode, example: CurrencyCode.USD })
  currencyCode: CurrencyCode;

  @ApiProperty({ description: 'Account type details', type: () => AccountTypeDto })
  @Type(() => AccountTypeDto)
  accountType: AccountTypeDto;
}
```

### Nested Object Types

Use `type: () => NestedDto` (lazy callback) for nested objects to avoid circular reference issues:

```typescript
@ApiProperty({ description: 'Linked transfer transaction', type: () => TransactionDto, required: false })
@Type(() => TransactionDto)
transfer?: TransactionDto;
```

### Enum Properties in Output

```typescript
@ApiProperty({ description: 'Bill frequency', enum: BillFrequency, example: BillFrequency.MONTHLY })
frequency: BillFrequency;
```

## Update DTOs (PartialType)

If update DTOs use `PartialType(CreateDto)`:

```typescript
export class UpdateAccountDto extends PartialType(CreateAccountDto) {}
```

NestJS Swagger automatically inherits `@ApiProperty()` from the parent and marks all properties as optional. **No additional decorators needed** on the update DTO itself.

If `PartialType` is imported from `@nestjs/swagger` (not `@nestjs/mapped-types`), it handles Swagger metadata automatically. If imported from `@nestjs/mapped-types`, switch the import to `@nestjs/swagger`:

```typescript
// Change this:
import { PartialType } from '@nestjs/mapped-types';
// To this:
import { PartialType } from '@nestjs/swagger';
```

Same for `PickType`, `OmitType`, `IntersectionType` — always import from `@nestjs/swagger` when Swagger is in use.

## Query DTOs

For DTOs used with `@Query()`, add `@ApiProperty()` or `@ApiPropertyOptional()`:

```typescript
export class PaginationDto {
  @ApiPropertyOptional({ description: 'Max results to return', example: 20, maximum: 100 })
  @IsOptional()
  @IsPositive()
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', example: 0, minimum: 0 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
```

## Realistic Example Values

Choose examples that make domain sense:

| Field | Domain | Example |
|---|---|---|
| Account name | Finance | `'Main Checking'`, `'Savings'`, `'Visa Credit Card'` |
| Category name | Finance | `'Groceries'`, `'Salary'`, `'Rent'` |
| Bill name | Finance | `'Netflix Subscription'`, `'Electricity Bill'` |
| Amount | Finance | `150.75`, `2500.00`, `9.99` |
| Budget name | Finance | `'Monthly Groceries'`, `'Entertainment Budget'` |
| Description | Transaction | `'Weekly grocery shopping'`, `'March rent payment'` |
| Email | Auth | `'alice@example.com'` |
| Name | User | `'Alice Johnson'` |
| Date | Any | `'2025-06-15T00:00:00.000Z'` |
| MongoId | Any | `'507f1f77bcf86cd799439011'` |
