// Core exports
export { SearchModel } from './core/SearchModel'
export { search, SearchError, VersionConflictError } from './core/SearchService'

// Decorator exports
export {
  DateType,
  DateOnlyType,
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
export { walkIndex } from './utils/walkIndex'

// Type exports
export type { SaveEvent, DeleteEvent, SearchOptions, SaveOptions } from './core/SearchModel'