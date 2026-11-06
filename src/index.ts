// Core exports
export { SearchModel } from './core/SearchModel'
export { search, SearchError, VersionConflictError } from './core/SearchService'
export { resolveIndexName } from './core/indexName'

// Decorator exports
export {
  DateType,
  DateOnlyType,
  StringType,
  NumberType,
  BooleanType,
  StringArrayType,
  VectorType,
  ObjectType,
  ObjectArrayType,
  KeywordType,
  StringMapType,
  GeoPointType,
  FieldMetadata,
  getFieldMetadata,
  validateFieldType
} from './decorators'

// Error exports
export { ValidationError, validationFail } from './errors/ValidationError'

// Utility exports
export { id } from './utils/id'
export { encodeDocumentId } from './utils/encodeDocumentId'
export { escapeSearchTerm } from './utils/escapeSearchTerm'
export { log, logError, logWarn, debug } from './utils/logging'
export { walkIndex } from './utils/walkIndex'

// Type exports
export type {
  SaveEvent,
  DeleteEvent,
  SearchOptions,
  SaveOptions,
  DeleteOptions,
} from './core/SearchModel'
