// Core exports
export { SearchModel } from './core/SearchModel'
export { SearchService, search, SearchError, VersionConflictError } from './core/SearchService'

// Decorator exports
export {
  DateType,
  StringType,
  NumberType,
  BooleanType,
  StringArrayType,
  ObjectType,
  ObjectArrayType,
  KeywordType,
  StringMapType,
  FieldMetadata,
  getFieldMetadata,
  validateFieldType
} from './decorators'

// Utility exports
export { id } from './utils/id'
export { log, logError, logWarn, debug } from './utils/logging'

// Type exports
export type { SaveEvent, DeleteEvent, SearchOptions } from './core/SearchModel'