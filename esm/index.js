export { SearchModel } from './core/SearchModel';
export { search, SearchError, VersionConflictError } from './core/SearchService';
export { resolveIndexName } from './core/indexName';
export { DateType, DateOnlyType, StringType, NumberType, BooleanType, StringArrayType, VectorType, ObjectType, ObjectArrayType, KeywordType, StringMapType, GeoPointType, getFieldMetadata, validateFieldType } from './decorators';
export { ValidationError, validationFail } from './errors/ValidationError';
export { id } from './utils/id';
export { encodeDocumentId } from './utils/encodeDocumentId';
export { escapeSearchTerm } from './utils/escapeSearchTerm';
export { log, logError, logWarn, debug } from './utils/logging';
export { walkIndex } from './utils/walkIndex';
//# sourceMappingURL=index.js.map