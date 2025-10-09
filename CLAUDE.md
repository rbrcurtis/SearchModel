# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager
This project uses **Yarn** as the package manager. Do not use npm.

## Common Commands

### Development
- `yarn install` - Install dependencies
- `yarn build` - Build all output formats (CJS, ESM, and TypeScript types)
- `yarn build:cjs` - Build CommonJS output to `lib/`
- `yarn build:esm` - Build ES modules output to `esm/`
- `yarn build:types` - Build TypeScript type definitions to `types/`
- `yarn clean` - Remove all build artifacts

### Testing
- `yarn test` - Run all tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage report
- Run single test file: `yarn test <path-to-test-file>`
  - Example: `yarn test src/core/__tests__/SearchModel.test.ts`
- Run tests matching pattern: `yarn test -t "<test-name-pattern>"`
  - Example: `yarn test -t "should create a new document"`

### Code Quality
- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier

## Pre-commit Hook
The project has a Husky pre-commit hook that runs `yarn build && yarn test` before each commit to ensure the code compiles successfully and all tests pass.

## Architecture Overview

### Core Design Pattern
This library implements the **Active Record pattern** for Elasticsearch with TypeScript decorator-based field validation and mapping generation.

### Key Components

#### 1. SearchModel (src/core/SearchModel.ts)
The abstract base class that all models extend. Key responsibilities:
- **Change Tracking**: Tracks which fields have been modified via `_changedFields` Set
- **Lifecycle Hooks**: Provides beforeSave, afterSave, beforeDelete, afterDelete hooks
- **Automatic Fields**: All models automatically have `id`, `createdAt`, `updatedAt`, and `version` fields
  - `id`: MongoDB ObjectID format, generated via `id()` utility
  - `createdAt`: Set once on document creation, never changes
  - `updatedAt`: Automatically updated to current time on every save
  - `version`: Starts at 1, increments on each save for optimistic locking
- **Optimistic Locking**: Uses version field for conflict detection (currently disabled in save method)
- **Private Storage**: Field values are stored in a Symbol-keyed private storage to avoid enumeration issues

Key methods:
- `create()` - Static method to create and save new documents
- `find()` / `findWithTotal()` - Query documents with Elasticsearch query string syntax
- `findOne()` - Find single document
- `getById()` - Retrieve document by ID
- `save()` - Save document (creates new or updates existing)
- `update()` - Update multiple properties at once without saving
- `delete()` - Delete document
- `toJSON()` / `toSearch()` - Convert instance to plain object
- `generateMapping()` - Generate Elasticsearch mapping from decorators
- `createIndex()` - Create Elasticsearch index with proper mappings

#### 2. SearchService (src/core/SearchService.ts)
Singleton service handling all Elasticsearch HTTP communication. Features:
- **Retry Logic**: Exponential backoff with jitter (max 3 retries)
- **Rate Limiting**: Automatic 429 handling with configurable delays
- **Error Handling**: Custom error classes (SearchError, VersionConflictError)
- **Environment Config**: Reads `ELASTICSEARCH_URL` from environment

Key methods:
- `searchRequest()` - Low-level HTTP request to Elasticsearch
- `query()` - High-level query with model class or index name
- `getById()` - Retrieve document by ID

#### 3. Decorator System (src/decorators/index.ts)
Property decorators that define field types, validation, and Elasticsearch mappings:

**Basic Types:**
- `@StringType(options)` - Text fields with trim, case conversion
- `@NumberType(options)` - Numeric fields
- `@DateType(options)` - Date fields (stored as ISO strings)
- `@BooleanType(options)` - Boolean fields
- `@KeywordType(options)` - Elasticsearch keyword fields (exact match)

**Array Types:**
- `@StringArrayType(options)` - Array of strings
- `@ObjectArrayType(options)` - Array of nested objects (supports `nested: true` option)

**Complex Types:**
- `@ObjectType(options)` - Nested object with property definitions
- `@StringMapType(options)` - JSON-serialized object stored as string

**Decorator Features:**
- Field validation on setter (type checking, custom validators)
- Automatic change tracking when values change
- Generates Elasticsearch mappings from metadata
- Private storage using Symbol to hide internal data
- Recursive validation for nested objects

#### 4. Utilities

**ID Generation (src/utils/id.ts):**
- Uses `bson-objectid` for MongoDB-compatible ObjectID generation
- Provides unique, time-sortable IDs

**Logging (src/utils/logging.ts):**
- Debug logging controlled by `DEBUG_TAGS` environment variable
- Tags: `elasticsearch`, `search`
- Functions: `log()`, `logError()`, `logWarn()`, `debug(tag, ...)`

### Build Configuration

The project builds three output formats:
1. **CommonJS** (`lib/`) - For Node.js `require()`
2. **ES Modules** (`esm/`) - For `import` statements
3. **Type Definitions** (`types/`) - For TypeScript consumers

Each format has its own tsconfig file:
- `tsconfig.cjs.json` - CommonJS build
- `tsconfig.esm.json` - ESM build
- `tsconfig.types.json` - Type definitions only

## Testing Conventions

### Test Location
- Tests are placed in `__tests__` directories alongside source files
- Test files use `.test.ts` or `.spec.ts` extensions

### Critical Testing Rules

**IMPORTANT**: All test IDs must use the `id()` function from `src/utils/id`:
```typescript
// ✅ Correct
import { id } from '../../utils/id'
const testId = id()

// ❌ Wrong
const testId = 'test-id'
```

This ensures unique IDs in tests and prevents conflicts.

### Test Environment
- Jest configured with `ts-jest` preset
- Node environment
- Tests run against actual Elasticsearch (requires `ELASTICSEARCH_URL` in env)
- Most tests create and delete their own indices using unique IDs

## Key Behaviors to Understand

### Automatic Timestamp Management
Every SearchModel instance has `createdAt` and `updatedAt` fields that are managed automatically:

**On Creation:**
- `create()` method sets both `createdAt` and `updatedAt` to `new Date()`
- `version` is set to 1
- Constructor with `data.id` and `data.version` marks document as existing (not new)

**On Save:**
- `save()` always sets `updatedAt` to `new Date()`
- For new documents: sets `createdAt` to current time and `version` to 1
- For existing documents: increments `version` by 1, leaves `createdAt` unchanged
- `_isNewDocument` flag tracks whether this is a new or existing document

**Implementation Details:**
- Timestamps are defined with `@DateType()` decorators on the base class
- Default values use `default: () => new Date()` in decorator options
- The `save()` method explicitly sets these values before sending to Elasticsearch
- Stored as ISO strings in Elasticsearch, converted to Date objects on load

### Field ID Auto-Conversion
Fields ending with "id" or "ids" are automatically converted to `keyword` type in Elasticsearch mappings, even if defined as `@StringType()`. This ensures proper exact matching for ID fields.

### String Transformations
String and Keyword fields support automatic transformations:
- `trim: true` - Remove leading/trailing whitespace
- `lowerCase: true` - Convert to lowercase
- `upperCase: true` - Convert to uppercase

These are applied in the order: trim → case conversion

### Change Tracking
- Fields track changes via `markFieldChanged()` called in property setters
- `getChangedFields()` returns array of modified field names
- Changes are cleared after successful save
- Used by lifecycle hooks to know what changed

**Critical Limitation: Array Mutations Not Detected**
- Array methods like `.push()`, `.pop()`, `.splice()` modify arrays in-place without calling setters
- These mutations are NOT tracked and will NOT be saved
- Solution: Always reassign the entire array when making changes
  - Wrong: `user.roles.push('admin')`
  - Correct: `user.roles = [...user.roles, 'admin']`
- This applies to `@StringArrayType()`, `@ObjectArrayType()`, and arrays within nested objects

### Lifecycle Hooks
Subclasses can override protected lifecycle methods:
- `beforeSave(event)` - Called before save, receives `{ updated: string[] }`
- `afterSave(event)` - Called after successful save
- `beforeDelete(event)` - Called before deletion
- `afterDelete(event)` - Called after successful deletion

### Version Conflict Detection
The library implements optimistic locking with version fields:
- New documents start with version 1
- Version increments on each save
- Version conflicts throw `VersionConflictError`
- **Note**: Version checking is currently disabled in save method (see line 509 in SearchModel.ts)

### StringMap Fields
`@StringMapType()` fields automatically:
- JSON.stringify on save
- JSON.parse on load from Elasticsearch
- Stored as text in Elasticsearch

### Next.js API Route Caveat
When using SearchModel instances in Next.js API routes, getter properties don't work properly due to execution context. Always use `.toJSON()`:
```typescript
// ❌ Wrong in Next.js API routes
const user = await User.getById(id)
return NextResponse.json({ name: user.name }) // undefined

// ✅ Correct
const user = await User.getById(id)
const userData = user?.toJSON()
return NextResponse.json({ name: userData?.name })
```

## Common Patterns

### Defining a Model
```typescript
import { SearchModel, StringType, NumberType, ObjectType } from 'search-model'

class MyModel extends SearchModel {
  static readonly indexName = 'my_index'

  // Note: id, createdAt, updatedAt, and version are inherited from SearchModel
  // You don't need to define them - they're automatic!

  @StringType({ required: true, trim: true })
  name!: string

  @NumberType({ validate: (n) => n >= 0 })
  count?: number

  @ObjectType({
    properties: {
      street: { type: 'string', options: { required: true } },
      city: { type: 'string' }
    }
  })
  address?: { street: string; city?: string }
}
```

### Nested Objects with ObjectArrayType
```typescript
@ObjectArrayType({
  nested: true, // Use Elasticsearch nested type for independent querying
  properties: {
    title: { type: 'string', options: { required: true } },
    items: {
      type: 'objectArray', // Nested arrays supported
      options: {
        properties: {
          name: { type: 'string' },
          value: { type: 'number' }
        }
      }
    }
  }
})
sections!: Array<{
  title: string
  items?: Array<{ name?: string; value?: number }>
}>
```

## Environment Variables
- `ELASTICSEARCH_URL` - Elasticsearch server URL (required)
- `DEBUG_TAGS` - Comma-separated debug tags: `elasticsearch,search`

## Important Notes

### When Adding New Field Types
1. Add type to the union in `FieldMetadata` and `ObjectPropertyDefinition`
2. Add validation case in `validateFieldType()`
3. Add decorator function (e.g., `MyType()`)
4. Add mapping case in `getElasticsearchFieldType()`
5. Add transformation case in `transformFieldValue()`

### When Modifying Core Classes
- SearchModel changes affect all models in the ecosystem
- SearchService changes affect all Elasticsearch communication
- Decorator changes require careful testing due to metadata reflection

### Build Process
- `prebuild` script automatically runs `yarn clean` before builds
- All three output formats must build successfully for commit to pass
- Type definitions are generated separately and must match runtime behavior
