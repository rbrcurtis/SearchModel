# SearchModel

TypeScript Active Record pattern implementation for Elasticsearch with decorator-based validation.

## Features

- 🎯 **Active Record Pattern**: Intuitive ORM-style interface for Elasticsearch
- 🎨 **Decorator-based Validation**: Type-safe field validation using TypeScript decorators
- 🔄 **Automatic Mapping Generation**: Generate Elasticsearch mappings from your models
- 📝 **Change Tracking**: Track field modifications for optimized updates
- ⏰ **Automatic Timestamps**: createdAt and updatedAt managed automatically
- 🚀 **Batch Updates**: Update multiple properties at once with `.update()` method
- 🪝 **Lifecycle Hooks**: beforeSave, afterSave, beforeDelete, afterDelete
- 🔁 **Retry Logic**: Built-in exponential backoff for rate limiting
- 🔒 **Type Safety**: Full TypeScript support with comprehensive typing
- 🏗️ **Nested Object Support**: Validate complex nested structures

## Installation

```bash
# Install from GitHub
npm install github:rbrcurtis/SearchModel

# Or with Yarn
yarn add github:rbrcurtis/SearchModel
```

## Quick Start

### 1. Set up environment variables

```bash
# .env
ELASTICSEARCH_URL=http://localhost:9200
DEBUG_TAGS=elasticsearch,search  # Optional: for debug logging
```

### 2. Define your model

```typescript
import 'dotenv/config'
import {
  SearchModel,
  StringType,
  KeywordType,
  DateType,
  NumberType,
  ObjectType,
  StringArrayType,
} from 'search-model'

class User extends SearchModel<User> {
  static readonly indexName = 'users'

  // These fields exist on SearchModel, but redeclaring them helps API decorators
  // and makes the model contract obvious to agents and generated schemas.
  // Use `declare` so TypeScript does not emit class fields that overwrite base accessors.
  @KeywordType()
  declare id: string

  @DateType()
  declare createdAt: Date

  @DateType()
  declare updatedAt: Date

  @NumberType()
  declare version: number

  @KeywordType({
    required: true,
    trim: true,
    lowerCase: true,
    validate: (email) => email.includes('@')
  })
  email!: string

  @StringType({ required: true, trim: true })
  name!: string

  @NumberType({
    validate: (age) => age >= 0 && age <= 150
  })
  age?: number

  @DateType()
  birthDate?: Date

  @StringArrayType({ default: () => [] })
  roles!: string[]

  @ObjectType({
    properties: {
      street: { type: 'string', options: { required: true } },
      city: { type: 'string', options: { required: true } },
      zipCode: { type: 'string' },
      country: { type: 'keyword' }
    }
  })
  address?: {
    street: string
    city: string
    zipCode?: string
    country?: string
  }
}
```

### 3. Create the index and use your model

```typescript
// Create Elasticsearch index with auto-generated mappings
await User.createIndex()

// Create a new user
const user = await User.create({
  email: 'john@example.com',
  name: 'John Doe',
  age: 30,
  roles: ['user', 'admin'],
  address: {
    street: '123 Main St',
    city: 'New York'
  }
})

// Find users
const users = await User.find(['email:john*', 'roles:admin'], {
  limit: 10,
  sort: 'createdAt:desc'
})

// Find one user
const user = await User.findOne(['email:john@example.com'])

// Get by ID
const user = await User.getById('507f1f77bcf86cd799439011')

// Update individual fields
user.name = 'Jane Doe'
await user.save()

// Update multiple fields at once; update() mutates the instance but does not save
user.update({
  name: 'Jane Smith',
  age: 32,
  roles: ['user', 'editor']
})
await user.save()

// Array mutations are tracked by the current SearchModel array proxy
user.roles.push('moderator')
await user.save({ wait: true }) // use wait when immediate read-after-write matters

// Delete
await user.delete()
```

## Automatic Fields

All models extending `SearchModel` automatically include these fields:

- **`id`** - Unique document identifier (MongoDB ObjectID format)
- **`createdAt`** - Timestamp when document was first created
- **`updatedAt`** - Timestamp when document was last modified
- **`version`** - Version number for optimistic locking (starts at 1)

You may redeclare these fields in subclasses when API decorators, schema generation, or readability benefit from explicit declarations. Use TypeScript `declare` so no JavaScript class field is emitted:

```typescript
class User extends SearchModel<User> {
  static readonly indexName = 'users'

  @KeywordType()
  declare id: string

  @DateType()
  declare createdAt: Date

  @DateType()
  declare updatedAt: Date

  @NumberType()
  declare version: number
}
```

This pattern also works with API/schema decorators such as TypeGraphQL decorators. Prefer explicit TypeGraphQL type functions instead of relying only on reflected metadata:

```typescript
@Field(() => ID)
@KeywordType()
declare id: string

@Field(() => Date)
@DateType()
declare createdAt: Date
```

Do not initialize SearchModel fields with inline class property defaults such as `roles = []`; put defaults in decorator options (`@StringArrayType({ default: () => [] })`) so the decorator-backed storage and validation stay consistent.

### Automatic Timestamp Management

The base class automatically manages timestamps:

```typescript
// When creating a new document
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
})
// createdAt and updatedAt are automatically set to current time
// version is set to 1
console.log(user.createdAt) // 2024-01-15T10:30:00.000Z
console.log(user.updatedAt) // 2024-01-15T10:30:00.000Z
console.log(user.version)   // 1

// When updating an existing document
user.name = 'Jane Doe'
await user.save()
// updatedAt is automatically updated to current time
// version is incremented
// createdAt remains unchanged
console.log(user.createdAt) // 2024-01-15T10:30:00.000Z (unchanged)
console.log(user.updatedAt) // 2024-01-15T10:35:00.000Z (updated)
console.log(user.version)   // 2
```

You normally do not manually set these fields at runtime - they are managed automatically by the base class.

## Field Decorators

### Basic Types

- `@StringType(options)` - Analyzed full-text fields such as names, titles, descriptions, and content
- `@KeywordType(options)` - Exact-match fields for IDs, emails, slugs, statuses, enum-like strings, filters, sorting, and aggregations
- `@NumberType(options)` - Numeric fields; numeric strings are coerced on assignment when valid
- `@DateType(options)` - Date fields (accepts Date objects or ISO strings)
- `@DateOnlyType(options)` - Date-only fields stored in `YYYY-MM-DD` form
- `@BooleanType(options)` - Boolean fields

### Array Types

- `@StringArrayType(options)` - Array of strings
- `@ObjectArrayType(options)` - Array of structured objects; flattened by default
- `@ObjectArrayType({ nested: true, properties })` - Elasticsearch nested mapping when array item boundaries matter for querying

Array mutations such as `.push()`, `.pop()`, and `.splice()` are tracked by the current SearchModel array proxy for `StringArrayType` and `ObjectArrayType` fields:

```typescript
user.roles.push('editor')
await user.save()

user.roles = [...user.roles, 'moderator']
await user.save()
```

### Complex Types

- `@ObjectType(options)` - Nested object with property definitions
- `@StringMapType(options)` - Arbitrary JSON-ish object stored as a JSON string; not queryable by nested keys
- `@GeoPointType(options)` - Geographic point stored as `{ lat: number, lon: number }`
- `@VectorType({ dimension })` - OpenSearch `knn_vector`; values must be finite numbers with the exact configured dimension

### Mapping Notes

- Fields ending in `id` or `ids` are automatically mapped as `keyword` even when declared with `@StringType()`.
- Prefer explicit `@KeywordType()` for IDs, statuses, slugs, and enum-like fields anyway; it documents intent.
- `@StringType()` maps to `text` with a `.keyword` subfield.
- `@KeywordType()` maps to `keyword` and is the safe default for exact filters.

### Decorator Options

All decorators support these base options:

```typescript
interface BaseFieldOptions {
  required?: boolean           // Field is required
  validate?: (value) => boolean  // Custom validation function
  transform?: (value) => any     // Transform value before storage
  default?: () => any           // Default value function
}
```

String-specific options:

```typescript
interface StringFieldOptions extends BaseFieldOptions {
  trim?: boolean      // Remove leading/trailing whitespace
  lowerCase?: boolean // Convert to lowercase
  upperCase?: boolean // Convert to uppercase
}
```

## Lifecycle Hooks

```typescript
class Post extends SearchModel<Post> {
  static readonly indexName = 'posts'

  @StringType({ required: true })
  title!: string

  @StringType()
  slug!: string

  protected async beforeSave(event: SaveEvent): Promise<boolean> {
    // Generate slug from title
    if (!this.slug) {
      this.slug = this.title.toLowerCase().replace(/\s+/g, '-')
    }
    return true
  }

  protected async afterSave(event: SaveEvent): Promise<void> {
    console.log('Updated fields:', event.updated)
    // Trigger cache invalidation, send notifications, etc.
  }

  protected async beforeDelete(event: DeleteEvent): Promise<void> {
    // Clean up related data
  }

  protected async afterDelete(event: DeleteEvent): Promise<void> {
    // Log deletion, update counters, etc.
  }
}
```

`beforeSave` can return `false` to skip saving. `event.updated` is computed before `beforeSave`, so fields changed inside `beforeSave` may not appear in that event. Defaults and required-field validation run after `beforeSave`.

## Nested Objects

```typescript
class BlogPost extends SearchModel<BlogPost> {
  static readonly indexName = 'blog_posts'
  
  @StringType({ required: true })
  title!: string
  
  @ObjectArrayType({
    properties: {
      author: { type: 'string', options: { required: true } },
      content: { type: 'string', options: { required: true } },
      timestamp: { type: 'date', options: { required: true } },
      likes: { type: 'number' },
      replies: {
        type: 'objectArray',
        options: {
          properties: {
            author: { type: 'string', options: { required: true } },
            content: { type: 'string', options: { required: true } },
            timestamp: { type: 'date' }
          }
        }
      }
    }
  })
  comments!: Array<{
    author: string
    content: string
    timestamp: Date
    likes?: number
    replies?: Array<{
      author: string
      content: string
      timestamp?: Date
    }>
  }>
}
```

## Search Queries

SearchModel uses Elasticsearch query-string terms as an array of strings. Terms are combined as `must` clauses with `default_operator: 'AND'`.

```typescript
// Simple field search
await User.find(['email:john@example.com'])

// Wildcards
await User.find(['name:John*'])

// Multiple conditions (AND)
await User.find(['status:active', 'role:admin'])

// Range queries
await User.find(['age:[18 TO 65]'])

// Query by automatic fields (createdAt, updatedAt, version)
await User.find(['createdAt:[2024-01-01 TO 2024-12-31]'])
await User.find(['updatedAt:[2024-01-01 TO *]'])

// Sort by automatic timestamp fields
await User.find(['status:active'], {
  sort: 'createdAt:desc',
  limit: 10
})

// Find with total count
const { hits, total } = await User.findWithTotal(['status:active'], {
  limit: 50,
  sort: 'updatedAt:desc',
  page: 2
})

// Find one document
const user = await User.findOne(['email:john@example.com'])

// Raw Elasticsearch sort arrays are allowed when needed
await User.find(['status:active'], {
  sort: [{ createdAt: { order: 'desc' } }]
})
```

Do not use ORM-style where objects; they are not part of this API:

```typescript
// ❌ Wrong
await User.find({ where: { status: 'active' } })
await User.findOne({ email: 'john@example.com' })

// ✅ Correct
await User.find(['status:active'])
await User.findOne(['email:john@example.com'])
```

## Direct Elasticsearch Access

For advanced use cases, you can access the Elasticsearch client directly:

```typescript
import { search } from 'search-model'

// Raw Elasticsearch request
const response = await search.searchRequest('POST', '/users/_search', {
  query: {
    bool: {
      must: [
        { match: { status: 'active' } },
        { range: { age: { gte: 18, lte: 65 } } }
      ]
    }
  },
  aggregations: {
    age_groups: {
      terms: { field: 'age' }
    }
  }
})
```

## Batch Updates

The `.update()` method allows you to update multiple properties at once efficiently:

```typescript
const user = await User.getById('507f1f77bcf86cd799439011')

// Update multiple fields with a single method call
user.update({
  name: 'John Smith',
  age: 31,
  email: 'john.smith@example.com',
  roles: ['user', 'admin'],
  address: {
    street: '456 Oak Avenue',
    city: 'Boston',
    zipCode: '02101'
  }
})

// Check which fields were changed
console.log(user.getChangedFields()) // ['name', 'age', 'email', 'roles', 'address']

// Save all changes at once
await user.save()
```

### Key Features of `.update()`:

- **Field Filtering**: Only updates properties that are valid model attributes (have decorators)
- **Type Safety**: Maintains all validation through existing property setters
- **Change Tracking**: Automatically tracks which fields were modified
- **No Auto-Save**: Gives you control over when to persist changes
- **Method Chaining**: Returns `this` for fluent interfaces
- **Error Handling**: Invalid property names are silently ignored

```typescript
// Example with invalid fields - they're safely ignored
user.update({
  name: 'Valid Field',        // ✅ Will be updated
  invalidField: 'ignored',    // ❌ Silently ignored
  anotherFake: { data: 123 }  // ❌ Silently ignored
})

// Only 'name' will be tracked as changed
console.log(user.getChangedFields()) // ['name']

// Method chaining
user.update({ name: 'First' })
    .update({ age: 25 })
    .update({ email: 'new@email.com' })

await user.save() // Saves all changes
```

## Walking Large Datasets

The `walkIndex` utility provides an efficient way to iterate through large numbers of documents with controlled concurrency:

```typescript
import { walkIndex } from 'search-model'

// Process all active users with 10 concurrent operations
await walkIndex(
  User,
  ['status:active'],
  async (user) => {
    // Process each user
    console.log(`Processing user: ${user.email}`)

    // Update, delete, or perform any async operation
    user.lastProcessed = new Date()
    await user.save()
  },
  { concurrency: 10 }
)
```

### How It Works

- **Efficient Pagination**: Uses search-after pattern with ID sorting for memory-efficient iteration
- **Batch Processing**: Fetches documents in batches of 100
- **Controlled Concurrency**: Processes documents with configurable parallelism (default: 10)
- **Memory Safe**: Collects all matching instances first, then processes with concurrency control

### Parameters

```typescript
walkIndex<T extends typeof SearchModel>(
  ModelClass: T,                          // Your SearchModel class
  terms: string[],                        // Elasticsearch query terms
  callback: (hit: InstanceType<T>) => Promise<void>,  // Async callback for each document
  options?: { concurrency?: number }      // Optional concurrency limit (default: 10)
): Promise<void>
```

### Example Use Cases

```typescript
// Bulk update all users created before 2024
await walkIndex(
  User,
  ['createdAt:[* TO 2024-01-01]'],
  async (user) => {
    user.migrated = true
    await user.save()
  },
  { concurrency: 20 }
)

// Process all documents (empty query matches all)
await walkIndex(
  Product,
  [],
  async (product) => {
    // Recalculate pricing, update cache, etc.
    await updateProductCache(product)
  }
)

// Delete old records with controlled parallelism
await walkIndex(
  LogEntry,
  ['timestamp:[* TO 2023-01-01]'],
  async (entry) => {
    await entry.delete()
  },
  { concurrency: 5 } // Lower concurrency for delete operations
)
```

### Performance Tips

- **Adjust Concurrency**: Higher values for I/O-bound tasks, lower for CPU-intensive operations
- **Batch Operations**: Consider batching saves or using bulk operations for better performance
- **Memory Usage**: The function collects all matching instances before processing - monitor memory for very large datasets
- **Error Handling**: Wrap callback in try-catch to handle individual document failures

```typescript
await walkIndex(
  User,
  ['status:pending'],
  async (user) => {
    try {
      await processUser(user)
    } catch (error) {
      console.error(`Failed to process user ${user.id}:`, error)
      // Log error but continue processing other users
    }
  }
)
```

## Change Tracking

Models automatically track which fields have been modified:

```typescript
class Product extends SearchModel<Product> {
  static readonly indexName = 'products'

  @StringType({ required: true })
  name!: string

  @NumberType({ required: true })
  price!: number

  protected async beforeSave(event: SaveEvent): Promise<void> {
    // event.updated contains array of changed field names
    if (event.updated.includes('price')) {
      // Price changed, update price history
      console.log('Price changed from', this.getOriginalValue('price'), 'to', this.price)
    }
  }
}
```

**Array mutation tracking**

Current SearchModel wraps `StringArrayType` and `ObjectArrayType` values in an array proxy, so array mutations are tracked:

```typescript
product.tags.push('new-tag')
console.log(product.getChangedFields()) // ['tags']

product.tags = [...product.tags, 'another-tag']
console.log(product.getChangedFields()) // ['tags']
```

Vector arrays are intentionally not proxy-wrapped. Assign a full new vector array when changing a `VectorType` field.

## Error Handling

```typescript
import { SearchError, VersionConflictError } from 'search-model'

try {
  await user.save()
} catch (error) {
  if (error instanceof VersionConflictError) {
    // Handle concurrent modification
    console.error('Document was modified by another process')
  } else if (error instanceof SearchError) {
    // Handle Elasticsearch errors
    console.error('Search error:', error.statusCode, error.message)
  } else {
    // Handle validation errors
    console.error('Validation error:', error.message)
  }
}
```

## Configuration

The library reads configuration from environment variables:

- `ELASTICSEARCH_URL` - Elasticsearch/OpenSearch server URL (required, no default)
- `DEBUG_TAGS` - Comma-separated debug tags for logging (e.g., "elasticsearch,search")

The variable is named `ELASTICSEARCH_URL` even when the backing service is OpenSearch. If an app uses a different environment variable such as `OPENSEARCH_NODE`, map it before model operations:

```typescript
if (!process.env.ELASTICSEARCH_URL && process.env.OPENSEARCH_NODE) {
  process.env.ELASTICSEARCH_URL = process.env.OPENSEARCH_NODE
}
```

For tests or workflows that immediately read after writing, use `save({ wait: true })` to request `refresh=wait_for`.

## API Reference

### SearchModel Static Methods

- `create(properties)` - Create and save a new document with provided properties
- `find(terms, options)` - Find documents matching query terms, returns array of model instances
- `findWithTotal(terms, options)` - Find documents with total count, returns `{ hits: T[], total: number }`
- `findOne(terms)` - Find first matching document or null
- `getById(id)` - Get document by ID or null if not found
- `createIndex()` - Create Elasticsearch index with mappings from decorators
- `generateMapping()` - Generate Elasticsearch mapping from decorator metadata
- `fromJSON(properties)` - Create model instance from plain object (factory method)
- `getElasticsearchFieldType(field)` - Convert field metadata to Elasticsearch field type
- `buildObjectMapping(properties)` - Build mapping for nested object properties

### SearchModel Instance Methods

- `save()` - Save document to Elasticsearch (creates new or updates existing)
- `update(data)` - Update multiple properties at once without saving (returns `this` for chaining)
- `delete()` - Delete document from Elasticsearch
- `toJSON()` - Convert to plain object for API/logging output; vector fields are redacted as `[vector: N dimensions]`
- `toSearch()` - Convert to Elasticsearch/OpenSearch document format with persisted values, including full vectors
- `toString()` - Convert redacted `toJSON()` output to a JSON string representation

### SearchModel Protected Methods (for subclasses)

- `markFieldChanged(fieldName)` - Mark a field as modified
- `getChangedFields()` - Get array of modified field names
- `clearChangedFields()` - Clear all change tracking
- `beforeSave(event)` - Lifecycle hook called before saving
- `afterSave(event)` - Lifecycle hook called after successful save
- `beforeDelete(event)` - Lifecycle hook called before deletion
- `afterDelete(event)` - Lifecycle hook called after successful deletion

#### Important: Using SearchModel in Next.js API Routes

When using SearchModel instances in Next.js API routes, the getter properties don't work properly due to the execution context. Always use `.toJSON()` to get the data:

```typescript
// ❌ Wrong - getters return undefined in API routes
export async function GET() {
  const user = await User.getById(id)
  return NextResponse.json({ name: user.name }) // name will be undefined
}

// ✅ Correct - use toJSON() to get the actual data
export async function GET() {
  const user = await User.getById(id)
  const userData = user?.toJSON()
  return NextResponse.json({ name: userData?.name }) // works correctly
}
```

This is necessary because Next.js API routes run in a different JavaScript context where the getter initialization from decorators doesn't work the same way as in Node.js scripts.

### Common Mistakes to Avoid

```typescript
// ❌ Wrong: no generic, no clear model type
class User extends SearchModel {}

// ✅ Correct
class User extends SearchModel<User> {
  static readonly indexName = 'users'
}

// ❌ Wrong: class property defaults bypass the decorator default pattern
class User extends SearchModel<User> {
  @StringArrayType()
  roles: string[] = []
}

// ✅ Correct
class User extends SearchModel<User> {
  @StringArrayType({ default: () => [] })
  roles!: string[]
}

// ✅ Correct: redeclare inherited fields for API decorators/schema visibility
class User extends SearchModel<User> {
  @KeywordType()
  declare id: string
}

// ❌ Wrong: where-object queries are not supported
await User.find({ where: { status: 'active' } })

// ✅ Correct
await User.find(['status:active'])

// ❌ Wrong: update() does not save
user.update({ status: 'active' })
return user

// ✅ Correct
user.update({ status: 'active' })
await user.save()

// ❌ Wrong: assuming createIndex migrates existing mappings
await User.createIndex()

// ✅ Correct: treat mapping changes as schema migrations and verify them against Elasticsearch/OpenSearch
```

### SearchService Methods

- `searchRequest(method, path, data, options?)` - Raw Elasticsearch HTTP request with optional version control
- `query(ModelClass, terms, options)` - Query with model class or index name, returns `{ hits: T[], total: number }`
- `getById(ModelClass, id)` - Get document by ID, returns model instance or null

### SearchService Configuration

The SearchService uses the following configuration from environment variables:
- `ELASTICSEARCH_URL` - Elasticsearch/OpenSearch server URL (required, no default)

The service automatically handles:
- Maximum retry attempts for failed requests: 3
- Base delay for exponential backoff: 1000ms  
- Maximum delay between retries: 30000ms

### Utility Functions

- `walkIndex(ModelClass, terms, callback, options?)` - Efficiently iterate through large datasets with controlled concurrency
  - `ModelClass` - Your SearchModel class
  - `terms` - Array of Elasticsearch query terms
  - `callback` - Async function called for each document
  - `options.concurrency` - Number of concurrent operations (default: 10)
- `id()` - Generate a MongoDB ObjectID-compatible unique identifier

### Error Classes

- `SearchError` - Base error class for all search-related errors
  - `message` - Error message
  - `statusCode` - HTTP status code (optional)
  - `response` - Raw error response (optional)
- `VersionConflictError` - Thrown when document version conflicts occur
  - `currentVersion` - Current version in database (optional)
  - `attemptedVersion` - Version that was attempted (optional)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/rbrcurtis/SearchModel/issues).