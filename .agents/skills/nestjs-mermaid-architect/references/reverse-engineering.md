# Reverse Engineering Reference

## Entity Discovery Strategy

Scan the codebase in this priority order to locate entity/model definitions:

### 1. Mongoose Schemas (NestJS + Mongoose)
- Files with `@Schema()` decorator or named `*.entity.ts`, `*.schema.ts`
- Properties defined with `@Prop()` decorator
- Relationships via `@Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'EntityName' })`
- Autopopulate indicated by `autopopulate: true` in `@Prop()` options
- Schema methods defined as class methods
- Subdocuments defined as separate classes with `@Schema({ _id: false })` or similar

### 2. TypeORM Entities
- Files with `@Entity()` decorator, typically in `entities/` or `models/` folders
- Properties with `@Column()`, `@PrimaryGeneratedColumn()`, `@CreateDateColumn()`, `@UpdateDateColumn()`
- Relationships via `@OneToOne()`, `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()` with `@JoinColumn()` or `@JoinTable()`
- Inheritance via `@TableInheritance()`, `@ChildEntity()`

### 3. Prisma Schemas
- `prisma/schema.prisma` file with `model` definitions
- Fields with types and modifiers (`?` optional, `[]` array, `@id`, `@unique`, `@default`)
- Relations via `@relation` directive with `fields` and `references`
- Enums defined with `enum` keyword

### 4. MikroORM Entities
- Files with `@Entity()` from `@mikro-orm/core`
- Properties with `@Property()`, `@PrimaryKey()`
- Relationships via `@OneToOne()`, `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()`

### 5. Plain TypeScript (Fallback)
- DTO classes and TypeScript interfaces representing domain models
- Infer relationships from type references (e.g., `userId: string`, `account: Account`, `items: Item[]`)

## Property Extraction Rules

For each entity, extract:
- Property name
- TypeScript type (resolve to primitive or enum name)
- Access modifier (`+` public by default, `-` private, `#` protected)
- Whether optional (from `?` or `@IsOptional()` or `required: false`)
- Default values (from `default:` in decorator options)

## Relationship Inference Rules

| ORM Pattern | Mermaid Notation |
|---|---|
| `@Prop({ ref: 'X' })` single ObjectId | `"1" --> "1"` or `"*" --> "1"` |
| `@Prop({ ref: 'X', type: [ObjectId] })` array | `"1" --> "*"` |
| `@OneToMany` / `@OneToOne` / `@ManyToOne` / `@ManyToMany` | Use decorator name directly |
| `property: SomeEntity` (no decorator) | Infer `"*" --> "1"` |
| `property: SomeEntity[]` (no decorator) | Infer `"1" --> "*"` |
| Self-reference (same entity type) | Show with self-referencing arrow |
| Subdocument/embedded | Use composition `*--` |

## Relationship Label Conventions

Use verb phrases describing the association from the owning entity's perspective:
- `User "1" --> "*" Account : owns`
- `Account "1" --> "*" Transaction : contains`
- `Category "1" --> "*" Transaction : classifies`
- `Bill "1" *-- "*" BillModification : overrides`
- `Transaction "1" --> "1" Transaction : transfers to`

## Base Class Handling

When entities extend a base class:
- If the base class adds properties (e.g., `createdAt`, `updatedAt`), include those properties in every entity that extends it
- Show inheritance with `<|--` only when the base class is a meaningful domain concept
- For audit/timestamp base classes, just include the properties inline — don't clutter the diagram with infrastructure inheritance

## Diagram Organization

Group entities by module using Mermaid comments as section separators:
```
%% Identity Module
class User { ... }

%% Financial Module
class Account { ... }
class Transaction { ... }
```

Place enums after all entity classes, in a separate `%% Enumerations` section.
Place relationships after all classes and enums, in a `%% Relationships` section.

## Scale Handling

- If >30 entities, ask user whether to generate full diagram or per-module subsets
- Per-module diagrams include only entities in that module + referenced entities from other modules (shown with minimal properties)
- Name per-module files: `class-diagram.<module-name>-module.md`
