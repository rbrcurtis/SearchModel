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
  DateType, 
  NumberType,
  ObjectType,
  StringArrayType 
} from 'search-model'

class User extends SearchModel {
  static readonly indexName = 'users'

  // Note: id, createdAt, updatedAt, and version are inherited automatically
  // from SearchModel - you don't need to define them!

  @StringType({
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
  
  @StringArrayType()
  roles!: string[]
  
  @ObjectType({
    properties: {
      street: { type: 'string', options: { required: true } },
      city: { type: 'string', options: { required: true } },
      zipCode: { type: 'string' },
      country: { type: 'string' }
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

// Update multiple fields at once
user.update({
  name: 'Jane Smith',
  age: 32,
  roles: ['user', 'editor']
})
await user.save()

// ⚠️ Important: Array mutations (push, pop, etc.) are NOT tracked
// Wrong: user.roles.push('editor') - NOT saved!
// Correct: user.roles = [...user.roles, 'editor']
user.roles = [...user.roles, 'editor']
await user.save()

// Delete
await user.delete()
```

## Automatic Fields

All models extending `SearchModel` automatically include these fields without needing to define them:

- **`id`** - Unique document identifier (MongoDB ObjectID format)
- **`createdAt`** - Timestamp when document was first created
- **`updatedAt`** - Timestamp when document was last modified
- **`version`** - Version number for optimistic locking (starts at 1)

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

You never need to manually set these fields - they are managed automatically by the base class.

## Field Decorators

### Basic Types

- `@StringType(options)` - String fields with trim, case conversion
- `@NumberType(options)` - Numeric fields
- `@DateType(options)` - Date fields (accepts Date objects or ISO strings)
- `@BooleanType(options)` - Boolean fields
- `@KeywordType(options)` - Elasticsearch keyword fields (not analyzed)

### Array Types

- `@StringArrayType(options)` - Array of strings
- `@ObjectArrayType(options)` - Array of nested objects

**⚠️ Important: Array Mutation Limitation**

The ORM **cannot detect** array mutations using methods like `.push()`, `.pop()`, `.splice()`, etc. You must reassign the entire array for changes to be tracked:

```typescript
// ❌ Wrong - changes NOT tracked
user.roles.push('editor')
await user.save() // Changes will NOT be saved

// ✅ Correct - reassign the array
user.roles = [...user.roles, 'editor']
await user.save() // Changes ARE tracked and saved

// ✅ Also correct
user.roles = user.roles.concat('editor')
await user.save()
```

This applies to all array types including `@StringArrayType()` and `@ObjectArrayType()`.

### Complex Types

- `@ObjectType(options)` - Nested object with property definitions
- `@StringMapType(options)` - JSON-serialized object (stored as string)

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
class Post extends SearchModel {
  static readonly indexName = 'posts'
  
  @StringType({ required: true })
  title!: string
  
  @StringType()
  slug!: string
  
  protected async beforeSave(event: SaveEvent): Promise<void> {
    // Generate slug from title
    if (!this.slug) {
      this.slug = this.title.toLowerCase().replace(/\s+/g, '-')
    }
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

## Nested Objects

```typescript
class BlogPost extends SearchModel {
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

The search uses Elasticsearch query string syntax:

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
  sort: 'createdAt:desc',  // Most recent first
  limit: 10
})

// Complex queries
await User.find([
  'status:active',
  'createdAt:[2024-01-01 TO *]',
  'email:*@company.com'
], {
  limit: 50,
  sort: 'updatedAt:desc',  // Sort by last modified
  page: 2
})
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

## Change Tracking

Models automatically track which fields have been modified:

```typescript
class Product extends SearchModel {
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

**⚠️ Array Mutation Limitation**

Change tracking works by detecting when property setters are called. Array mutations (`.push()`, `.pop()`, `.splice()`, etc.) modify the array in-place without calling the setter, so they are **not tracked**:

```typescript
// ❌ Wrong - NOT tracked
product.tags.push('new-tag')
console.log(product.getChangedFields()) // [] - empty!

// ✅ Correct - IS tracked
product.tags = [...product.tags, 'new-tag']
console.log(product.getChangedFields()) // ['tags']
```

Always reassign arrays when making changes to ensure proper change tracking.

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

- `ELASTICSEARCH_URL` - Elasticsearch server URL (required, no default)
- `DEBUG_TAGS` - Comma-separated debug tags for logging (e.g., "elasticsearch,search")

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
- `toJSON()` - Convert to plain object with all field values
- `toSearch()` - Convert to Elasticsearch document format (same as toJSON)
- `toString()` - Convert to JSON string representation

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

### SearchService Methods

- `searchRequest(method, path, data, options?)` - Raw Elasticsearch HTTP request with optional version control
- `query(ModelClass, terms, options)` - Query with model class or index name, returns `{ hits: T[], total: number }`
- `getById(ModelClass, id)` - Get document by ID, returns model instance or null

### SearchService Configuration

The SearchService uses the following configuration from environment variables:
- `ELASTICSEARCH_URL` - Elasticsearch server URL (required, no default)

The service automatically handles:
- Maximum retry attempts for failed requests: 3
- Base delay for exponential backoff: 1000ms  
- Maximum delay between retries: 30000ms

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