import { createTrackedArray } from '../utils/arrayProxy'

/** Metadata key for storing field type information */
const FIELD_METADATA_KEY = Symbol('fieldMetadata')

/** Symbol key for private storage - completely hidden from users */
export const PRIVATE_STORAGE = Symbol('__privateStorage__')

/**
 * Base options available for all field types.
 *
 * @property required - Field must have a value (not undefined/null)
 * @property transform - Custom transformation function applied to value before storage
 * @property validate - Custom validation function, returns true if valid
 * @property default - Factory function to generate default value for new documents
 */
interface BaseFieldOptions {
  required?: boolean
  transform?: (value: any) => any
  validate?: (value: any) => boolean
  default?: () => any
}

/**
 * Options specific to string and keyword field types.
 * Extends base options with string transformation capabilities.
 *
 * @property trim - Remove leading/trailing whitespace
 * @property lowerCase - Convert string to lowercase
 * @property upperCase - Convert string to uppercase
 *
 * Transformations are applied in order: trim → case conversion
 */
interface StringFieldOptions extends BaseFieldOptions {
  trim?: boolean
  lowerCase?: boolean
  upperCase?: boolean
}

/**
 * Definition for a property within an ObjectType or ObjectArrayType field.
 * Used to define nested object structures with validation.
 *
 * @property type - The field type for this property
 * @property options - Type-specific options for this property
 */
interface ObjectPropertyDefinition {
  type:
    | 'date'
    | 'string'
    | 'number'
    | 'stringArray'
    | 'object'
    | 'objectArray'
    | 'boolean'
    | 'keyword'
    | 'stringMap'
  options?: BaseFieldOptions | StringFieldOptions | ObjectFieldOptions
}

/**
 * Options for ObjectType and ObjectArrayType decorators.
 *
 * @property properties - Defines structure of nested object with validation rules
 * @property nested - (ObjectArrayType only) Use Elasticsearch nested type for independent querying.
 *                    Defaults to false. Set true when you need to query array items independently.
 */
interface ObjectFieldOptions extends BaseFieldOptions {
  properties: Record<string, ObjectPropertyDefinition>
  nested?: boolean // Only applies to ObjectArrayType - defaults to false
}

/**
 * Metadata stored for each decorated field, used for validation and Elasticsearch mapping generation.
 */
export interface FieldMetadata {
  propertyKey: string
  type:
    | 'date'
    | 'string'
    | 'number'
    | 'stringArray'
    | 'object'
    | 'objectArray'
    | 'boolean'
    | 'keyword'
    | 'stringMap'
  options?: BaseFieldOptions | StringFieldOptions | ObjectFieldOptions
}

/**
 * Retrieves field metadata for all decorated properties on a class.
 * Used internally for validation and Elasticsearch mapping generation.
 *
 * @param target - The class prototype to get metadata from
 * @returns Array of field metadata for all decorated properties
 */
export function getFieldMetadata(target: any): FieldMetadata[] {
  return Reflect.getMetadata(FIELD_METADATA_KEY, target) || []
}

// Helper function to set field metadata on a class
function setFieldMetadata(target: any, metadata: FieldMetadata): void {
  const existingMetadata = getFieldMetadata(target)
  const updatedMetadata = [...existingMetadata, metadata]
  Reflect.defineMetadata(FIELD_METADATA_KEY, updatedMetadata, target)
}

// Recursive validation for nested objects
function validateObjectProperties(
  obj: any,
  properties: Record<string, ObjectPropertyDefinition>,
  fieldPath: string
): void {
  for (const [propKey, propDef] of Object.entries(properties)) {
    const propPath = `${fieldPath}.${propKey}`
    const propValue = obj[propKey]
    const propOptions = propDef.options || {}

    // Check required properties
    if (
      propOptions.required &&
      (propValue === undefined || propValue === null)
    ) {
      throw new Error(`Required property '${propPath}' is missing`)
    }

    if (propValue !== undefined && propValue !== null) {
      validateFieldType(propValue, propDef.type, propPath, propDef.options)
    }
  }
}

/**
 * Validates that a value matches the expected field type.
 * Throws an error if validation fails.
 *
 * @param value - The value to validate
 * @param type - The expected field type
 * @param propertyKey - Name of the property being validated (for error messages)
 * @param options - Type-specific options (used for nested object validation)
 * @throws Error if value doesn't match expected type or fails validation
 */
export function validateFieldType(
  value: any,
  type: string,
  propertyKey: string,
  options?: any
): void {
  switch (type) {
    case 'date':
      if (!(value instanceof Date) && typeof value !== 'string') {
        throw new Error(
          `Field '${propertyKey}' must be a Date or string, got ${typeof value}`
        )
      }
      if (typeof value === 'string' && isNaN(Date.parse(value))) {
        throw new Error(`Field '${propertyKey}' must be a valid date string`)
      }
      break
    case 'string':
    case 'keyword':
      if (typeof value !== 'string') {
        throw new Error(
          `Field '${propertyKey}' must be a string, got ${typeof value}`
        )
      }
      break
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(
          `Field '${propertyKey}' must be a valid number, got ${typeof value} (${value})`
        )
      }
      break
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(
          `Field '${propertyKey}' must be a boolean, got ${typeof value}`
        )
      }
      break
    case 'stringArray':
      if (!Array.isArray(value)) {
        throw new Error(
          `Field '${propertyKey}' must be an array, got ${typeof value}`
        )
      }
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] !== 'string') {
          throw new Error(
            `Field '${propertyKey}' must be an array of strings, found ${typeof value[i]} at index ${i}`
          )
        }
      }
      break
    case 'object':
      if (value === null) {
        throw new Error(`Field '${propertyKey}' must be an object, got null`)
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(
          `Field '${propertyKey}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`
        )
      }
      if (options && options.properties) {
        validateObjectProperties(value, options.properties, propertyKey)
      }
      break
    case 'objectArray':
      if (!Array.isArray(value)) {
        throw new Error(
          `Field '${propertyKey}' must be an array, got ${typeof value}`
        )
      }
      if (options && options.properties) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          if (
            typeof item !== 'object' ||
            Array.isArray(item) ||
            item === null
          ) {
            throw new Error(
              `Field '${propertyKey}[${i}]' must be an object, got ${typeof item}`
            )
          }
          validateObjectProperties(
            item,
            options.properties,
            `${propertyKey}[${i}]`
          )
        }
      }
      break
    case 'stringMap':
      if (value === null) {
        throw new Error(`Field '${propertyKey}' must be an object, got null`)
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(
          `Field '${propertyKey}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`
        )
      }
      break
  }
}

// Helper to get private storage for an instance
function getPrivateStorage(instance: any): Record<string, any> {
  if (!instance[PRIVATE_STORAGE]) {
    // Use Object.defineProperty to make it non-enumerable
    Object.defineProperty(instance, PRIVATE_STORAGE, {
      value: {},
      writable: false,
      enumerable: false,
      configurable: false,
    })
  }
  return instance[PRIVATE_STORAGE]
}

// Create property setter with validation and change tracking
function createValidatedProperty(
  target: any,
  propertyKey: string,
  type: string,
  options: BaseFieldOptions | StringFieldOptions | ObjectFieldOptions
) {
  Object.defineProperty(target, propertyKey, {
    get: function () {
      const storage = getPrivateStorage(this)
      const value = storage[propertyKey]

      // Wrap arrays with proxy for mutation tracking
      if (
        value &&
        Array.isArray(value) &&
        (type === 'stringArray' || type === 'objectArray')
      ) {
        // Only wrap if not already wrapped
        if (!(value as any).__isTrackedArray) {
          const trackedArray = createTrackedArray(value, () => {
            if (this.markFieldChanged) {
              this.markFieldChanged(propertyKey)
            }
          })
          storage[propertyKey] = trackedArray
          return trackedArray
        }
      }

      return value
    },
    set: function (value: any) {
      const storage = getPrivateStorage(this)
      const oldValue = storage[propertyKey]

      if (value !== undefined && value !== null) {
        // Coerce numeric strings to numbers for number fields
        if (type === 'number' && typeof value === 'string') {
          const num = Number(value)
          if (!isNaN(num)) {
            value = num
          }
        }

        // Type validation
        validateFieldType(value, type, propertyKey, options)

        // Custom validation
        if (options.validate && !options.validate(value)) {
          throw new Error(`Field '${propertyKey}' failed custom validation`)
        }

        // Wrap arrays with proxy for mutation tracking
        if (
          Array.isArray(value) &&
          (type === 'stringArray' || type === 'objectArray')
        ) {
          const trackedArray = createTrackedArray(value, () => {
            if (this.markFieldChanged) {
              this.markFieldChanged(propertyKey)
            }
          })
          storage[propertyKey] = trackedArray
        } else {
          storage[propertyKey] = value
        }
      } else {
        // Set the new value
        storage[propertyKey] = value
      }

      // Track field changes (if the value actually changed and this is a SearchModel instance)
      if (this.markFieldChanged && oldValue !== value) {
        this.markFieldChanged(propertyKey)
      }
    },
    enumerable: true,
    configurable: true,
  })
}

/**
 * Decorator for Date fields. Accepts Date objects or ISO date strings.
 * Dates are stored as ISO strings in Elasticsearch and converted back to Date objects on load.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @DateType({ required: true })
 *   publishedAt!: Date
 *
 *   @DateType({ default: () => new Date() })
 *   createdAt?: Date
 * }
 * ```
 */
export function DateType(options: BaseFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'date',
      options,
    })
    createValidatedProperty(target, propertyKey, 'date', options)
  }
}

/**
 * Decorator for text string fields. Mapped to Elasticsearch 'text' type for full-text search.
 * Use this for fields that need to be analyzed and searchable (descriptions, content, etc.).
 *
 * Note: Fields ending with "id" or "ids" are automatically mapped as keywords for exact matching.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.trim - Remove leading/trailing whitespace
 * @param options.lowerCase - Convert to lowercase
 * @param options.upperCase - Convert to uppercase
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @StringType({ required: true, trim: true })
 *   name!: string
 *
 *   @StringType({ lowerCase: true })
 *   email?: string
 *
 *   @StringType({ validate: (v) => v.length <= 500 })
 *   description?: string
 * }
 * ```
 */
export function StringType(options: StringFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'string',
      options,
    })
    createValidatedProperty(target, propertyKey, 'string', options)
  }
}

/**
 * Decorator for numeric fields (integers and floats).
 * Mapped to Elasticsearch numeric types based on value range.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function (e.g., range checking)
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @NumberType({ required: true, validate: (n) => n >= 0 })
 *   price!: number
 *
 *   @NumberType({ default: () => 0 })
 *   count?: number
 *
 *   @NumberType({ validate: (n) => n >= 0 && n <= 100 })
 *   percentage?: number
 * }
 * ```
 */
export function NumberType(options: BaseFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'number',
      options,
    })
    createValidatedProperty(target, propertyKey, 'number', options)
  }
}

/**
 * Decorator for boolean fields (true/false).
 * Mapped to Elasticsearch 'boolean' type.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @BooleanType({ default: () => false })
 *   isActive?: boolean
 *
 *   @BooleanType({ required: true })
 *   emailVerified!: boolean
 * }
 * ```
 */
export function BooleanType(options: BaseFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'boolean',
      options,
    })
    createValidatedProperty(target, propertyKey, 'boolean', options)
  }
}

/**
 * Decorator for arrays of strings.
 * Mapped to Elasticsearch 'text' type (arrays are natively supported).
 *
 * IMPORTANT: Array mutations are tracked via Proxy. In-place modifications (push, pop, splice, etc.)
 * now properly trigger change tracking.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @StringArrayType({ required: true })
 *   tags!: string[]
 *
 *   @StringArrayType({ default: () => [] })
 *   roles?: string[]
 *
 *   // Both approaches work with mutation tracking:
 *   model.tags.push('new-tag')  // ✅ Tracked
 *   model.tags = [...model.tags, 'new-tag']  // ✅ Also tracked
 * }
 * ```
 */
export function StringArrayType(options: BaseFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'stringArray',
      options,
    })
    createValidatedProperty(target, propertyKey, 'stringArray', options)
  }
}

/**
 * Decorator for nested object fields with defined structure.
 * Provides validation for nested properties based on the properties definition.
 * Mapped to Elasticsearch 'object' type (flattened for querying).
 *
 * @param options - Field configuration options
 * @param options.properties - Object structure definition with property types
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @ObjectType({
 *     properties: {
 *       street: { type: 'string', options: { required: true } },
 *       city: { type: 'string', options: { trim: true } },
 *       zipCode: { type: 'string' },
 *       coordinates: {
 *         type: 'object',
 *         options: {
 *           properties: {
 *             lat: { type: 'number', options: { required: true } },
 *             lng: { type: 'number', options: { required: true } }
 *           }
 *         }
 *       }
 *     }
 *   })
 *   address?: {
 *     street: string
 *     city?: string
 *     zipCode?: string
 *     coordinates?: { lat: number; lng: number }
 *   }
 * }
 * ```
 */
export function ObjectType(options: ObjectFieldOptions) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'object',
      options,
    })
    createValidatedProperty(target, propertyKey, 'object', options)
  }
}

/**
 * Decorator for arrays of nested objects with defined structure.
 * Validates each array item against the properties definition.
 * Supports nested arrays within objects.
 *
 * IMPORTANT: Array mutations are tracked via Proxy. In-place modifications (push, pop, splice, etc.)
 * now properly trigger change tracking.
 *
 * @param options - Field configuration options
 * @param options.properties - Object structure definition for array items
 * @param options.nested - Use Elasticsearch 'nested' type (default: false).
 *                        Set true when you need to query array items independently.
 *                        With nested=false, array items are flattened and lose object boundaries.
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   // Standard object array (flattened in Elasticsearch)
 *   @ObjectArrayType({
 *     properties: {
 *       name: { type: 'string', options: { required: true } },
 *       value: { type: 'number' }
 *     }
 *   })
 *   metadata?: Array<{ name: string; value?: number }>
 *
 *   // Nested object array (maintains object boundaries for independent querying)
 *   @ObjectArrayType({
 *     nested: true,
 *     properties: {
 *       title: { type: 'string', options: { required: true } },
 *       items: {
 *         type: 'objectArray',
 *         options: {
 *           properties: {
 *             name: { type: 'string' },
 *             count: { type: 'number' }
 *           }
 *         }
 *       }
 *     }
 *   })
 *   sections!: Array<{
 *     title: string
 *     items?: Array<{ name?: string; count?: number }>
 *   }>
 *
 *   // Both mutation approaches work:
 *   model.sections.push({ title: 'New Section' })  // ✅ Tracked
 *   model.sections = [...model.sections, { title: 'New' }]  // ✅ Also tracked
 * }
 * ```
 */
export function ObjectArrayType(options: ObjectFieldOptions) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'objectArray',
      options,
    })
    createValidatedProperty(target, propertyKey, 'objectArray', options)
  }
}

/**
 * Decorator for keyword fields (exact-match strings).
 * Mapped to Elasticsearch 'keyword' type - not analyzed, used for filtering, sorting, and aggregations.
 * Use this for IDs, status codes, tags, email addresses, or any field requiring exact matching.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.trim - Remove leading/trailing whitespace
 * @param options.lowerCase - Convert to lowercase
 * @param options.upperCase - Convert to uppercase
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @KeywordType({ required: true, lowerCase: true })
 *   status!: string  // "active", "inactive", etc.
 *
 *   @KeywordType({ trim: true })
 *   userId?: string
 *
 *   @KeywordType()
 *   category?: string  // Exact match for filtering/aggregations
 * }
 * ```
 */
export function KeywordType(options: StringFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'keyword',
      options,
    })
    createValidatedProperty(target, propertyKey, 'keyword', options)
  }
}

/**
 * Decorator for dynamic key-value object fields (maps/dictionaries).
 * Automatically JSON.stringify on save and JSON.parse on load from Elasticsearch.
 * Stored as text in Elasticsearch, not queryable by nested keys.
 *
 * Use this when you need to store arbitrary key-value data without predefined structure.
 * For structured nested objects, use @ObjectType instead.
 *
 * @param options - Field configuration options
 * @param options.required - Field must have a value
 * @param options.validate - Custom validation function
 * @param options.default - Factory function for default value
 *
 * @example
 * ```typescript
 * class MyModel extends SearchModel {
 *   @StringMapType()
 *   settings?: Record<string, any>
 *
 *   @StringMapType({ default: () => ({}) })
 *   customFields?: { [key: string]: string | number }
 *
 *   // Usage:
 *   model.settings = { theme: 'dark', pageSize: 20, features: ['a', 'b'] }
 *   await model.save()
 *   // Stored as JSON string in Elasticsearch
 *   // Automatically parsed back to object on load
 * }
 * ```
 */
export function StringMapType(options: BaseFieldOptions = {}) {
  return function (target: any, propertyKey: string): void {
    setFieldMetadata(target, {
      propertyKey,
      type: 'stringMap',
      options,
    })
    createValidatedProperty(target, propertyKey, 'stringMap', options)
  }
}
