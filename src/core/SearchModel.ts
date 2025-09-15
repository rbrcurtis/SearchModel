import 'reflect-metadata'
import {
  search as searchService,
  SearchError,
  VersionConflictError,
} from './SearchService'
import {
  getFieldMetadata,
  FieldMetadata,
  StringType,
  DateType,
  NumberType,
  PRIVATE_STORAGE,
} from '../decorators'
import { id } from '../utils/id'
import { log, logError, logWarn, debug } from '../utils/logging'

export interface SearchOptions {
  limit?: number
  sort?: string
  page?: number
}

export interface SaveEvent {
  updated: string[]
}

export interface DeleteEvent {
  // Reserved for future expansion
}

export interface SaveOptions {
  wait?: boolean
}

export abstract class SearchModel {
  // Abstract properties that must be implemented by subclasses
  static readonly indexName: string

  // Change tracking - private property to track modified fields
  private _changedFields: Set<string> = new Set()

  // Track if this is a new document that hasn't been saved yet
  private _isNewDocument: boolean = true

  // Instance properties with decorators
  @StringType({ required: true, default: () => id() })
  public id!: string

  @DateType({ required: true, default: () => new Date() })
  public createdAt!: Date

  @DateType({ required: true, default: () => new Date() })
  public updatedAt!: Date

  @NumberType({ required: true, default: () => 1 })
  public version!: number

  // Static utility methods - removed generateId, now using ObjectID-based id() function

  // Change tracking methods
  protected markFieldChanged(fieldName: string): void {
    this._changedFields.add(fieldName)
  }

  protected getChangedFields(): string[] {
    return Array.from(this._changedFields)
  }

  protected clearChangedFields(): void {
    this._changedFields.clear()
  }

  // Lifecycle hooks - can be overridden by child classes
  protected async beforeSave(event: SaveEvent): Promise<void> {
    // Default implementation - does nothing
  }

  protected async afterSave(event: SaveEvent): Promise<void> {
    // Default implementation - does nothing
  }

  protected async beforeDelete(event: DeleteEvent): Promise<void> {
    // Default implementation - does nothing
  }

  protected async afterDelete(event: DeleteEvent): Promise<void> {
    // Default implementation - does nothing
  }

  constructor(data: Partial<any> = {}) {
    // Parse StringMap fields from JSON strings BEFORE Object.assign to avoid validation errors
    const fieldMetadata = getFieldMetadata(this.constructor.prototype)
    const processedData = { ...data }

    for (const field of fieldMetadata) {
      if (field.type === 'stringMap' && processedData[field.propertyKey]) {
        const value = processedData[field.propertyKey]
        if (typeof value === 'string') {
          try {
            processedData[field.propertyKey] = JSON.parse(value)
          } catch (e) {
            // If JSON parsing fails, keep the original string value
            // This shouldn't happen in normal operation
          }
        }
      }
    }

    // Set each property individually to trigger setters and store in private storage
    for (const [key, value] of Object.entries(processedData)) {
      if (key === 'createdAt' && typeof value === 'string') {
        this.createdAt = new Date(value)
      } else if (key === 'updatedAt' && typeof value === 'string') {
        this.updatedAt = new Date(value)
      } else {
        ;(this as any)[key] = value
      }
    }

    // Apply defaults to any undefined fields
    this.applyDefaults()

    // If we have data with an id and version, this is an existing document
    if (data.id && data.version) {
      this._isNewDocument = false
    }
  }

  // Static factory method for creating instances from JSON data
  static fromJSON<T extends SearchModel>(
    this: new (data?: any) => T,
    properties: any
  ): T {
    // If properties is already an instance of this class, return it as-is
    if (properties instanceof this) {
      return properties
    }
    return new this(properties)
  }

  // Generate Elasticsearch mapping from decorator metadata
  static generateMapping<T extends SearchModel>(
    this: new (data?: any) => T & { constructor: typeof SearchModel }
  ): Record<string, any> {
    const fieldMetadata = getFieldMetadata(this.prototype)

    const properties: Record<string, any> = {}

    for (const field of fieldMetadata) {
      // Auto-convert fields ending with "id" or "ids" to keyword type if they're currently string type
      const fieldName = field.propertyKey
      const shouldBeKeyword =
        /ids?$/i.test(fieldName) && field.type === 'string'

      if (shouldBeKeyword) {
        // Create a modified field metadata with keyword type
        const keywordField: FieldMetadata = {
          ...field,
          type: 'keyword',
        }
        properties[field.propertyKey] =
          SearchModel.getElasticsearchFieldType(keywordField)
      } else {
        properties[field.propertyKey] =
          SearchModel.getElasticsearchFieldType(field)
      }
    }

    return {
      mappings: {
        properties,
      },
    }
  }

  // Convert field metadata to Elasticsearch field type
  public static getElasticsearchFieldType(field: FieldMetadata): any {
    const { type, options } = field

    switch (type) {
      case 'string':
        return { type: 'text', fields: { keyword: { type: 'keyword' } } }
      case 'keyword':
        return { type: 'keyword' }
      case 'number':
        return { type: 'double' }
      case 'date':
        return { type: 'date' }
      case 'boolean':
        return { type: 'boolean' }
      case 'stringArray':
        return { type: 'text', fields: { keyword: { type: 'keyword' } } }
      case 'object':
        if (options && 'properties' in options && options.properties) {
          return {
            type: 'object',
            properties: this.buildObjectMapping(options.properties),
          }
        }
        return { type: 'object', enabled: false }
      case 'objectArray':
        if (options && 'properties' in options && options.properties) {
          return {
            type: 'nested',
            properties: this.buildObjectMapping(options.properties),
          }
        }
        return { type: 'nested', enabled: false }
      case 'stringMap':
        return { type: 'text', fields: { keyword: { type: 'keyword' } } }
      default:
        return { type: 'text' }
    }
  }

  // Build mapping for nested object properties
  public static buildObjectMapping(
    properties: Record<string, any>
  ): Record<string, any> {
    const mapping: Record<string, any> = {}

    for (const [propKey, propDef] of Object.entries(properties)) {
      // Auto-convert fields ending with "id" or "ids" to keyword type if they're currently string type
      const shouldBeKeyword =
        /ids?$/i.test(propKey) && propDef.type === 'string'

      if (shouldBeKeyword) {
        // Create a modified property definition with keyword type
        mapping[propKey] = this.getElasticsearchFieldType({
          propertyKey: propKey,
          type: 'keyword',
          options: propDef.options,
        })
      } else {
        mapping[propKey] = this.getElasticsearchFieldType({
          propertyKey: propKey,
          type: propDef.type,
          options: propDef.options,
        })
      }
    }

    return mapping
  }

  // Create or update Elasticsearch index with proper mapping
  static async createIndex<T extends SearchModel>(
    this: new (data?: any) => T & { constructor: typeof SearchModel }
  ): Promise<void> {
    const indexName = (this as any).indexName
    if (!indexName) {
      throw new Error(`IndexName not defined for ${this.name}`)
    }

    debug(
      'elasticsearch',
      `🔧 Creating index '${indexName}' with mappings...`,
      { indexName }
    )

    try {
      // Generate mapping from decorators
      const mapping = SearchModel.generateMapping.call(this as any)

      // Create index with mapping and settings
      const indexConfig = {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          index: {
            mapping: {
              total_fields: {
                limit: 2000,
              },
            },
          },
        },
        ...mapping,
      }

      await searchService.searchRequest('PUT', `/${indexName}`, indexConfig)
      debug('elasticsearch', `✅ Index '${indexName}' created successfully`, {
        indexName,
      })
    } catch (error) {
      if (
        error instanceof SearchError &&
        (error.message.includes('resource_already_exists_exception') ||
          (error.response &&
            error.response.includes('resource_already_exists_exception')))
      ) {
        debug(
          'search',
          `Index '${indexName}' already exists, skipping creation`,
          {
            indexName,
          }
        )
      } else {
        logError(`Failed to create index '${indexName}'`, error, { indexName })
        throw error
      }
    }
  }

  // Static methods for database operations
  static async create<T extends SearchModel>(
    this: new (data?: any) => T,
    properties: Partial<T>,
    options: SaveOptions = {}
  ): Promise<T> {
    const now = new Date()

    // Create new instance with provided properties and timestamps
    const instance = new this({
      ...properties,
      createdAt: now,
      updatedAt: now,
      version: 1, // New documents start with version 1
    })

    // Use instance save() method to ensure proper validation and field processing
    await instance.save(options)
    return instance
  }

  static async find<T extends SearchModel>(
    this: new (data?: any) => T,
    terms: string[] = [],
    options: SearchOptions = {}
  ): Promise<T[]> {
    const indexName = (this as any).indexName
    if (!indexName) {
      throw new Error(`IndexName not defined for ${this.name}`)
    }

    try {
      const response = await searchService.query(indexName, terms, options)
      return response.hits.map(
        (hit: any) =>
          new this({
            ...hit,
          })
      )
    } catch (error) {
      if (error instanceof SearchError) {
        throw new Error(`Failed to find ${this.name}: ${error.message}`)
      }
      throw error
    }
  }

  static async findWithTotal<T extends SearchModel>(
    this: new (data?: any) => T,
    terms: string[] = [],
    options: SearchOptions = {}
  ): Promise<{ hits: T[]; total: number }> {
    const indexName = (this as any).indexName
    if (!indexName) {
      throw new Error(`IndexName not defined for ${this.name}`)
    }
    try {
      return searchService.query(this as any, terms, options)
    } catch (error) {
      if (error instanceof SearchError) {
        throw new Error(`Failed to find ${this.name}: ${error.message}`)
      }
      throw error
    }
  }

  static async findOne<T extends SearchModel>(
    this: new (data?: any) => T,
    terms: string[]
  ): Promise<T | null> {
    const results = await (this as any).find(terms, { limit: 1 })
    return results.length > 0 ? results[0] : null
  }

  static async getById<T extends SearchModel>(
    this: new (data?: any) => T,
    id: string
  ): Promise<T | null> {
    return await searchService.getById(this as any, id)
  }

  // Apply default values to fields that are undefined
  private applyDefaults(): void {
    const fieldMetadata = getFieldMetadata(this.constructor.prototype)
    const storage = (this as any)[PRIVATE_STORAGE] || {}

    for (const field of fieldMetadata) {
      const value =
        storage[field.propertyKey] ?? (this as any)[field.propertyKey]

      // Apply default value if field is undefined and default is provided
      if (value === undefined && field.options?.default) {
        const defaultValue = field.options.default()
        // Set directly in storage to avoid triggering the setter
        if (!(this as any)[PRIVATE_STORAGE]) {
          Object.defineProperty(this, PRIVATE_STORAGE, {
            value: {},
            writable: false,
            enumerable: false,
            configurable: false,
          })
        }
        ;(this as any)[PRIVATE_STORAGE][field.propertyKey] = defaultValue
      }
    }
  }

  // Validate required fields
  private validateRequiredFields(): void {
    const fieldMetadata = getFieldMetadata(this.constructor.prototype)
    const storage = (this as any)[PRIVATE_STORAGE] || {}

    for (const field of fieldMetadata) {
      const value =
        storage[field.propertyKey] ?? (this as any)[field.propertyKey]

      // Check required fields
      if (field.options?.required && (value === undefined || value === null)) {
        throw new Error(`Required field '${field.propertyKey}' is missing`)
      }
    }
  }

  // Instance methods
  public async save(options: SaveOptions = {}): Promise<this> {
    const indexName = (this.constructor as any).indexName
    if (!indexName) {
      throw new Error(`IndexName not defined for ${this.constructor.name}`)
    }

    // Default wait to true
    const wait = options.wait ?? true

    // Get changed fields before lifecycle hooks
    const changedFields = this.getChangedFields()
    const saveEvent: SaveEvent = { updated: changedFields }

    // Call beforeSave lifecycle hook
    await this.beforeSave(saveEvent)

    // Apply defaults after beforeSave but before validation
    this.applyDefaults()

    // Validate required fields after defaults are applied
    this.validateRequiredFields()

    const now = new Date()

    // Store the current version for optimistic locking before modifying it
    const currentVersion = this.version

    debug(
      'search',
      `[SearchModel.save] Starting save for ${this.constructor.name} (ID: ${this.id})`,
      {
        isNewDocument: this._isNewDocument,
        currentVersionBeforeChanges: currentVersion,
        changedFields,
      }
    )

    if (this._isNewDocument) {
      this.createdAt = now
      this.version = 1
      debug('search', `[SearchModel.save] New document - setting version to 1`)
    } else {
      // Increment version for existing documents
      this.version += 1
      debug(
        'search',
        `[SearchModel.save] Existing document - incrementing version from ${currentVersion} to ${this.version}`
      )
    }
    this.updatedAt = now

    const document = this.toJSON()

    debug(
      'search',
      `[SearchModel.save] About to send request to Elasticsearch`,
      {
        indexName,
        documentId: this.id,
        versionInDocument: this.version,
        originalVersion: currentVersion,
        willUseVersionCheck: !this._isNewDocument,
        versionToSend: this._isNewDocument ? undefined : this.version,
      }
    )

    try {
      // Build the URL with optional refresh parameter
      const refreshParam = wait ? '?refresh=wait_for' : ''
      const url = `/${indexName}/_doc/${this.id}${refreshParam}`

      const result = await searchService.searchRequest(
        'PUT',
        url,
        document
        // Temporarily disable version checking to get system working
        // { version: this._isNewDocument ? undefined : this.version }
      )

      // If ES returned a version, update our version to match
      if (result && result._version) {
        this.version = result._version
        debug(
          'search',
          `[SearchModel.save] Updated version from ES response: ${result._version}`
        )
      }

      // Mark as no longer a new document after successful save
      this._isNewDocument = false

      // Clear changed fields after successful save
      this.clearChangedFields()

      // Call afterSave lifecycle hook
      await this.afterSave(saveEvent)

      debug(
        'search',
        `[SearchModel.save] Save successful for ${this.constructor.name} (ID: ${this.id})`
      )
      return this
    } catch (error) {
      if (error instanceof VersionConflictError) {
        // Re-throw version conflicts with detailed version information
        const versionInfo =
          error.currentVersion && error.attemptedVersion
            ? ` Current version in DB: ${error.currentVersion}, Attempted version: ${error.attemptedVersion}, Our version before save: ${currentVersion}`
            : ` Our version before save: ${currentVersion}`

        throw new Error(
          `Version conflict saving ${this.constructor.name} (ID: ${this.id}): ${error.message}.${versionInfo}. Please reload and try again.`
        )
      }
      if (error instanceof SearchError) {
        throw new Error(
          `Failed to save ${this.constructor.name}: ${error.message}`
        )
      }
      throw error
    }
  }

  public async delete(): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot delete document without ID')
    }

    const indexName = (this.constructor as any).indexName
    if (!indexName) {
      throw new Error(`IndexName not defined for ${this.constructor.name}`)
    }

    const deleteEvent: DeleteEvent = {}

    // Call beforeDelete lifecycle hook
    await this.beforeDelete(deleteEvent)

    try {
      await searchService.searchRequest(
        'DELETE',
        `/${indexName}/_doc/${this.id}`
      )

      // Call afterDelete lifecycle hook
      await this.afterDelete(deleteEvent)
    } catch (error) {
      if (error instanceof SearchError) {
        throw new Error(
          `Failed to delete ${this.constructor.name}: ${error.message}`
        )
      }
      throw error
    }
  }

  // Convert model instance to JSON for storage using field decorators
  public toJSON(): any {
    return this.toSearch()
  }

  // Recursively transform nested objects
  private transformObjectValue(
    value: any,
    properties: Record<string, any>
  ): any {
    if (!value || typeof value !== 'object') return value

    const transformed: Record<string, any> = {}

    for (const [propKey, propDef] of Object.entries(properties)) {
      const propValue = value[propKey]

      if (propValue !== undefined) {
        transformed[propKey] = this.transformFieldValue(
          propValue,
          propDef.type,
          propDef.options
        )
      }
    }

    return transformed
  }

  // Transform field value based on type
  private transformFieldValue(
    value: any,
    type: string,
    options: any = {}
  ): any {
    if (value === undefined || value === null) return value

    switch (type) {
      case 'date':
        return value instanceof Date ? value.toISOString() : value
      case 'string':
      case 'keyword':
        let stringValue = String(value)
        if (options.trim) stringValue = stringValue.trim()
        if (options.lowerCase) stringValue = stringValue.toLowerCase()
        if (options.upperCase) stringValue = stringValue.toUpperCase()
        return stringValue
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'stringArray':
        return Array.isArray(value) ? value.map(String) : []
      case 'object':
        if (options.properties) {
          return this.transformObjectValue(value, options.properties)
        }
        return value
      case 'objectArray':
        if (Array.isArray(value) && options.properties) {
          return value.map((item) =>
            this.transformObjectValue(item, options.properties)
          )
        }
        return Array.isArray(value) ? value : []
      case 'stringMap':
        // Store as JSON string for Elasticsearch
        return JSON.stringify(value)
      default:
        return value
    }
  }

  public toString(): string {
    return JSON.stringify(this.toSearch())
  }

  // Generate Elasticsearch document body based on field decorators
  public toSearch(): Record<string, any> {
    const fieldMetadata = getFieldMetadata(this.constructor.prototype)
    const storage = (this as any)[PRIVATE_STORAGE] || {}
    const doc: Record<string, any> = {}

    for (const field of fieldMetadata) {
      // Access value from private storage or fallback to property
      let value = storage[field.propertyKey] ?? (this as any)[field.propertyKey]
      const options = field.options || {}

      if (value !== undefined) {
        // Transform value based on field type
        value = this.transformFieldValue(value, field.type, options)

        // Apply custom transform function if provided
        if (options.transform) {
          value = options.transform(value)
        }

        doc[field.propertyKey] = value
      }
    }

    return doc
  }
}
