"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchModel = void 0;
require("reflect-metadata");
const SearchService_1 = require("./SearchService");
const decorators_1 = require("../decorators");
const id_1 = require("../utils/id");
const logging_1 = require("../utils/logging");
class SearchModel {
    markFieldChanged(fieldName) {
        this._changedFields.add(fieldName);
    }
    getChangedFields() {
        return Array.from(this._changedFields);
    }
    clearChangedFields() {
        this._changedFields.clear();
    }
    async beforeSave(event) {
        return true;
    }
    async afterSave(event) {
    }
    async beforeDelete(event) {
    }
    async afterDelete(event) {
    }
    constructor(data) {
        this._changedFields = new Set();
        this._isNewDocument = true;
        const fieldMetadata = (0, decorators_1.getFieldMetadata)(this.constructor.prototype);
        const processedData = { ...data };
        const fieldTypeMap = new Map();
        for (const field of fieldMetadata) {
            fieldTypeMap.set(field.propertyKey, field.type);
        }
        for (const field of fieldMetadata) {
            const value = processedData[field.propertyKey];
            if (value !== undefined && value !== null) {
                if (field.type === 'date' && typeof value === 'string') {
                    processedData[field.propertyKey] = new Date(value);
                }
                if (field.type === 'stringMap' && typeof value === 'string') {
                    try {
                        processedData[field.propertyKey] = JSON.parse(value);
                    }
                    catch (e) {
                    }
                }
            }
        }
        for (const [key, value] of Object.entries(processedData)) {
            ;
            this[key] = value;
        }
        this.applyDefaults();
        if (data?.id && data?.version) {
            this._isNewDocument = false;
        }
    }
    static fromJSON(properties) {
        if (properties instanceof this) {
            return properties;
        }
        return new this(properties);
    }
    static generateMapping() {
        const fieldMetadata = (0, decorators_1.getFieldMetadata)(this.prototype);
        const properties = {};
        for (const field of fieldMetadata) {
            const fieldName = field.propertyKey;
            const shouldBeKeyword = /ids?$/i.test(fieldName) && field.type === 'string';
            if (shouldBeKeyword) {
                const keywordField = {
                    ...field,
                    type: 'keyword',
                };
                properties[field.propertyKey] =
                    SearchModel.getElasticsearchFieldType(keywordField);
            }
            else {
                properties[field.propertyKey] =
                    SearchModel.getElasticsearchFieldType(field);
            }
        }
        return {
            mappings: {
                properties,
            },
        };
    }
    static getElasticsearchFieldType(field) {
        const { type, options } = field;
        switch (type) {
            case 'string':
                return { type: 'text', fields: { keyword: { type: 'keyword' } } };
            case 'keyword':
                return { type: 'keyword', fields: { keyword: { type: 'keyword' } } };
            case 'number':
                return { type: 'double' };
            case 'date':
                return { type: 'date' };
            case 'boolean':
                return { type: 'boolean' };
            case 'stringArray':
                return { type: 'text', fields: { keyword: { type: 'keyword' } } };
            case 'object':
                if (options && 'properties' in options && options.properties) {
                    return {
                        type: 'object',
                        properties: this.buildObjectMapping(options.properties),
                    };
                }
                return { type: 'object', enabled: false };
            case 'objectArray':
                if (options && 'properties' in options && options.properties) {
                    const useNested = options.nested === true;
                    return {
                        type: useNested ? 'nested' : 'object',
                        properties: this.buildObjectMapping(options.properties),
                    };
                }
                return { type: 'object', enabled: false };
            case 'stringMap':
                return { type: 'text', fields: { keyword: { type: 'keyword' } } };
            default:
                return { type: 'text' };
        }
    }
    static buildObjectMapping(properties) {
        const mapping = {};
        for (const [propKey, propDef] of Object.entries(properties)) {
            const shouldBeKeyword = /ids?$/i.test(propKey) && propDef.type === 'string';
            if (shouldBeKeyword) {
                mapping[propKey] = this.getElasticsearchFieldType({
                    propertyKey: propKey,
                    type: 'keyword',
                    options: propDef.options,
                });
            }
            else {
                mapping[propKey] = this.getElasticsearchFieldType({
                    propertyKey: propKey,
                    type: propDef.type,
                    options: propDef.options,
                });
            }
        }
        return mapping;
    }
    static async createIndex() {
        const indexName = this.indexName;
        if (!indexName) {
            throw new Error(`IndexName not defined for ${this.name}`);
        }
        (0, logging_1.debug)('elasticsearch', `🔧 Creating index '${indexName}' with mappings...`, { indexName });
        try {
            const mapping = SearchModel.generateMapping.call(this);
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
            };
            await SearchService_1.search.searchRequest('PUT', `/${indexName}`, indexConfig);
            (0, logging_1.debug)('elasticsearch', `✅ Index '${indexName}' created successfully`, {
                indexName,
            });
        }
        catch (error) {
            if (error instanceof SearchService_1.SearchError &&
                (error.message.includes('resource_already_exists_exception') ||
                    (error.response &&
                        error.response.includes('resource_already_exists_exception')))) {
                (0, logging_1.debug)('search', `Index '${indexName}' already exists, skipping creation`, {
                    indexName,
                });
            }
            else {
                (0, logging_1.logError)(`Failed to create index '${indexName}'`, error, { indexName });
                throw error;
            }
        }
    }
    static async create(properties, options = {}) {
        const now = new Date();
        const instance = new this({
            ...properties,
            createdAt: now,
            updatedAt: now,
            version: 1,
        });
        await instance.save(options);
        return instance;
    }
    static async find(terms = [], options = {}) {
        const indexName = this.indexName;
        if (!indexName) {
            throw new Error(`IndexName not defined for ${this.name}`);
        }
        try {
            const response = await SearchService_1.search.query(indexName, terms, options);
            return response.hits.map((hit) => new this({
                ...hit,
            }));
        }
        catch (error) {
            if (error instanceof SearchService_1.SearchError) {
                throw new Error(`Failed to find ${this.name}: ${error.message}`);
            }
            throw error;
        }
    }
    static async findWithTotal(terms = [], options = {}) {
        const indexName = this.indexName;
        if (!indexName) {
            throw new Error(`IndexName not defined for ${this.name}`);
        }
        try {
            return SearchService_1.search.query(this, terms, options);
        }
        catch (error) {
            if (error instanceof SearchService_1.SearchError) {
                throw new Error(`Failed to find ${this.name}: ${error.message}`);
            }
            throw error;
        }
    }
    static async findOne(terms) {
        const results = await this.find(terms, { limit: 1 });
        return results.length > 0 ? results[0] : null;
    }
    static async getById(id) {
        return await SearchService_1.search.getById(this, id);
    }
    applyDefaults() {
        const fieldMetadata = (0, decorators_1.getFieldMetadata)(this.constructor.prototype);
        const storage = this[decorators_1.PRIVATE_STORAGE] || {};
        for (const field of fieldMetadata) {
            const value = storage[field.propertyKey] ?? this[field.propertyKey];
            if (value === undefined && field.options?.default) {
                const defaultValue = field.options.default();
                if (!this[decorators_1.PRIVATE_STORAGE]) {
                    Object.defineProperty(this, decorators_1.PRIVATE_STORAGE, {
                        value: {},
                        writable: false,
                        enumerable: false,
                        configurable: false,
                    });
                }
                ;
                this[decorators_1.PRIVATE_STORAGE][field.propertyKey] = defaultValue;
            }
        }
    }
    validateRequiredFields() {
        const fieldMetadata = (0, decorators_1.getFieldMetadata)(this.constructor.prototype);
        const storage = this[decorators_1.PRIVATE_STORAGE] || {};
        for (const field of fieldMetadata) {
            const value = storage[field.propertyKey] ?? this[field.propertyKey];
            if (field.options?.required && (value === undefined || value === null)) {
                throw new Error(`Required field '${field.propertyKey}' is missing`);
            }
        }
    }
    async save(options = {}) {
        (0, logging_1.debug)('search', `[SearchModel.save] Starting save for ${this.constructor.name} (ID: ${this.id})`, {
            options,
        });
        const indexName = this.constructor.indexName;
        if (!indexName) {
            throw new Error(`IndexName not defined for ${this.constructor.name}`);
        }
        const wait = options.wait ?? true;
        const changedFields = this.getChangedFields();
        const saveEvent = { updated: changedFields };
        const canSave = await this.beforeSave(saveEvent);
        if (!canSave) {
            (0, logging_1.logWarn)(`[SearchModel.save] Before save hook returned false for ${this.constructor.name} (ID: ${this.id})`);
            return this;
        }
        this.applyDefaults();
        this.validateRequiredFields();
        const now = new Date();
        const currentVersion = this.version;
        (0, logging_1.debug)('search', `[SearchModel.save] Starting save for ${this.constructor.name} (ID: ${this.id})`, {
            isNewDocument: this._isNewDocument,
            currentVersionBeforeChanges: currentVersion,
            changedFields,
        });
        if (this._isNewDocument) {
            this.createdAt = now;
            this.version = 1;
            (0, logging_1.debug)('search', `[SearchModel.save] New document - setting version to 1`);
        }
        else {
            this.version += 1;
            (0, logging_1.debug)('search', `[SearchModel.save] Existing document - incrementing version from ${currentVersion} to ${this.version}`);
        }
        this.updatedAt = now;
        const document = this.toJSON();
        (0, logging_1.debug)('search', `[SearchModel.save] About to send request to Elasticsearch`, {
            indexName,
            documentId: this.id,
            versionInDocument: this.version,
            originalVersion: currentVersion,
            willUseVersionCheck: !this._isNewDocument,
            versionToSend: this._isNewDocument ? undefined : this.version,
        });
        try {
            const refreshParam = wait ? '?refresh=wait_for' : '';
            const url = `/${indexName}/_doc/${this.id}${refreshParam}`;
            const result = await SearchService_1.search.searchRequest('PUT', url, document);
            if (result && result._version) {
                this.version = result._version;
                (0, logging_1.debug)('search', `[SearchModel.save] Updated version from ES response: ${result._version}`);
            }
            this._isNewDocument = false;
            await this.afterSave(saveEvent);
            this.clearChangedFields();
            (0, logging_1.debug)('search', `[SearchModel.save] Save successful for ${this.constructor.name} (ID: ${this.id})`);
            return this;
        }
        catch (error) {
            if (error instanceof SearchService_1.VersionConflictError) {
                const versionInfo = error.currentVersion && error.attemptedVersion
                    ? ` Current version in DB: ${error.currentVersion}, Attempted version: ${error.attemptedVersion}, Our version before save: ${currentVersion}`
                    : ` Our version before save: ${currentVersion}`;
                throw new Error(`Version conflict saving ${this.constructor.name} (ID: ${this.id}): ${error.message}.${versionInfo}. Please reload and try again.`);
            }
            if (error instanceof SearchService_1.SearchError) {
                throw new Error(`Failed to save ${this.constructor.name}: ${error.message}`);
            }
            throw error;
        }
    }
    async delete() {
        if (!this.id) {
            throw new Error('Cannot delete document without ID');
        }
        const indexName = this.constructor.indexName;
        if (!indexName) {
            throw new Error(`IndexName not defined for ${this.constructor.name}`);
        }
        const deleteEvent = {};
        await this.beforeDelete(deleteEvent);
        try {
            await SearchService_1.search.searchRequest('DELETE', `/${indexName}/_doc/${this.id}`);
            await this.afterDelete(deleteEvent);
        }
        catch (error) {
            if (error instanceof SearchService_1.SearchError) {
                throw new Error(`Failed to delete ${this.constructor.name}: ${error.message}`);
            }
            throw error;
        }
    }
    toJSON() {
        return this.toSearch();
    }
    transformObjectValue(value, properties) {
        if (!value || typeof value !== 'object')
            return value;
        const transformed = {};
        for (const [propKey, propDef] of Object.entries(properties)) {
            const propValue = value[propKey];
            if (propValue !== undefined) {
                transformed[propKey] = this.transformFieldValue(propValue, propDef.type, propDef.options);
            }
        }
        return transformed;
    }
    transformFieldValue(value, type, options = {}) {
        if (value === undefined || value === null)
            return value;
        switch (type) {
            case 'date':
                return value instanceof Date ? value.toISOString() : value;
            case 'string':
            case 'keyword':
                let stringValue = String(value);
                if (options.trim)
                    stringValue = stringValue.trim();
                if (options.lowerCase)
                    stringValue = stringValue.toLowerCase();
                if (options.upperCase)
                    stringValue = stringValue.toUpperCase();
                return stringValue;
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'stringArray':
                return Array.isArray(value) ? value.map(String) : [];
            case 'object':
                if (options.properties) {
                    return this.transformObjectValue(value, options.properties);
                }
                return value;
            case 'objectArray':
                if (Array.isArray(value) && options.properties) {
                    return value.map((item) => this.transformObjectValue(item, options.properties));
                }
                return Array.isArray(value) ? value : [];
            case 'stringMap':
                return JSON.stringify(value);
            default:
                return value;
        }
    }
    toString() {
        return JSON.stringify(this.toSearch());
    }
    update(data) {
        const fieldMetadata = (0, decorators_1.getFieldMetadata)(this.constructor.prototype);
        const validFields = new Set(fieldMetadata.map((field) => field.propertyKey));
        for (const [key, value] of Object.entries(data)) {
            if (validFields.has(key)) {
                ;
                this[key] = value;
            }
        }
        return this;
    }
    toSearch() {
        const fieldMetadata = (0, decorators_1.getFieldMetadata)(this.constructor.prototype);
        const storage = this[decorators_1.PRIVATE_STORAGE] || {};
        const doc = {};
        for (const field of fieldMetadata) {
            let value = storage[field.propertyKey] ?? this[field.propertyKey];
            const options = field.options || {};
            if (value !== undefined) {
                value = this.transformFieldValue(value, field.type, options);
                if (options.transform) {
                    value = options.transform(value);
                }
                doc[field.propertyKey] = value;
            }
        }
        return doc;
    }
}
exports.SearchModel = SearchModel;
__decorate([
    (0, decorators_1.StringType)({ required: true, default: () => (0, id_1.id)() }),
    __metadata("design:type", String)
], SearchModel.prototype, "id", void 0);
__decorate([
    (0, decorators_1.DateType)({ required: true, default: () => new Date() }),
    __metadata("design:type", Date)
], SearchModel.prototype, "createdAt", void 0);
__decorate([
    (0, decorators_1.DateType)({ required: true, default: () => new Date() }),
    __metadata("design:type", Date)
], SearchModel.prototype, "updatedAt", void 0);
__decorate([
    (0, decorators_1.NumberType)({ required: true, default: () => 1 }),
    __metadata("design:type", Number)
], SearchModel.prototype, "version", void 0);
//# sourceMappingURL=SearchModel.js.map