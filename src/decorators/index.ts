// Metadata key for storing field type information
const FIELD_METADATA_KEY = Symbol('fieldMetadata')

// Symbol key for private storage - completely hidden from users
export const PRIVATE_STORAGE = Symbol('__privateStorage__')

// Base options for all field types
interface BaseFieldOptions {
  required?: boolean
  transform?: (value: any) => any
  validate?: (value: any) => boolean
  default?: () => any
}

// String-specific options
interface StringFieldOptions extends BaseFieldOptions {
  trim?: boolean
  lowerCase?: boolean
  upperCase?: boolean
}

// Object property definition
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

// Object-specific options
interface ObjectFieldOptions extends BaseFieldOptions {
  properties: Record<string, ObjectPropertyDefinition>
}

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

// Helper function to get field metadata from a class
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

// Validation functions for each type
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
          `Field '${propertyKey}' must be a valid number, got ${typeof value}`
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
      configurable: false
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
      return storage[propertyKey]
    },
    set: function (value: any) {
      const storage = getPrivateStorage(this)
      const oldValue = storage[propertyKey]

      if (value !== undefined && value !== null) {
        // Type validation
        validateFieldType(value, type, propertyKey, options)

        // Custom validation
        if (options.validate && !options.validate(value)) {
          throw new Error(`Field '${propertyKey}' failed custom validation`)
        }
      }

      // Set the new value
      storage[propertyKey] = value

      // Track field changes (if the value actually changed and this is a SearchModel instance)
      if (this.markFieldChanged && oldValue !== value) {
        this.markFieldChanged(propertyKey)
      }
    },
    enumerable: true,
    configurable: true,
  })
}

// Date field decorator
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

// String field decorator
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

// Number field decorator
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

// Boolean field decorator
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

// String array field decorator
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

// Object field decorator
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

// Object array field decorator
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

// Keyword field decorator
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

// String map field decorator - automatically JSON.stringify on save and parse on load
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
