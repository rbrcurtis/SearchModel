"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const SearchModel_1 = require("../SearchModel");
const decorators_1 = require("../../decorators");
const SearchService = __importStar(require("../SearchService"));
const id_1 = require("../../utils/id");
jest.mock('../SearchService');
class TestModel extends SearchModel_1.SearchModel {
}
TestModel.indexName = 'test-index';
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], TestModel.prototype, "name", void 0);
__decorate([
    (0, decorators_1.NumberType)(),
    __metadata("design:type", Number)
], TestModel.prototype, "age", void 0);
__decorate([
    (0, decorators_1.BooleanType)(),
    __metadata("design:type", Boolean)
], TestModel.prototype, "active", void 0);
describe('SearchModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('constructor', () => {
        it('should create instance with provided data', () => {
            const testId = (0, id_1.id)();
            const data = {
                id: testId,
                name: 'Test Name',
                age: 25,
                active: true,
                version: 2
            };
            const model = new TestModel(data);
            expect(model.id).toBe(testId);
            expect(model.name).toBe('Test Name');
            expect(model.age).toBe(25);
            expect(model.active).toBe(true);
            expect(model.version).toBe(2);
        });
        it('should parse date strings', () => {
            const dateStr = '2024-01-01T00:00:00.000Z';
            const model = new TestModel({
                createdAt: dateStr,
                updatedAt: dateStr
            });
            expect(model.createdAt).toBeInstanceOf(Date);
            expect(model.updatedAt).toBeInstanceOf(Date);
            expect(model.createdAt.toISOString()).toBe(dateStr);
        });
    });
    describe('fromJSON', () => {
        it('should create instance from JSON data', () => {
            const jsonId = (0, id_1.id)();
            const data = {
                id: jsonId,
                name: 'JSON Test',
                age: 30
            };
            const model = TestModel.fromJSON(data);
            expect(model).toBeInstanceOf(TestModel);
            expect(model.id).toBe(jsonId);
            expect(model.name).toBe('JSON Test');
            expect(model.age).toBe(30);
        });
        it('should return the same instance when passed an instance', () => {
            const testId = (0, id_1.id)();
            const originalInstance = new TestModel({
                id: testId,
                name: 'Original Instance',
                age: 25
            });
            const result = TestModel.fromJSON(originalInstance);
            expect(result).toBe(originalInstance);
            expect(result.id).toBe(testId);
            expect(result.name).toBe('Original Instance');
            expect(result.age).toBe(25);
        });
    });
    describe('generateMapping', () => {
        it('should generate Elasticsearch mapping from decorators', () => {
            const mapping = SearchModel_1.SearchModel.generateMapping.call(TestModel);
            expect(mapping).toHaveProperty('mappings');
            expect(mapping.mappings).toHaveProperty('properties');
            const props = mapping.mappings.properties;
            expect(props.name).toEqual({ type: 'text', fields: { keyword: { type: 'keyword' } } });
            expect(props.age).toEqual({ type: 'double' });
            expect(props.active).toEqual({ type: 'boolean' });
            expect(props.createdAt).toEqual({ type: 'date' });
            expect(props.updatedAt).toEqual({ type: 'date' });
        });
        it('should convert fields ending with "id" to keyword type', () => {
            class ModelWithIds extends SearchModel_1.SearchModel {
            }
            ModelWithIds.indexName = 'test-ids';
            __decorate([
                (0, decorators_1.StringType)(),
                __metadata("design:type", String)
            ], ModelWithIds.prototype, "userId", void 0);
            __decorate([
                (0, decorators_1.StringType)(),
                __metadata("design:type", String)
            ], ModelWithIds.prototype, "productIds", void 0);
            const mapping = SearchModel_1.SearchModel.generateMapping.call(ModelWithIds);
            const props = mapping.mappings.properties;
            expect(props.userId).toEqual({ type: 'keyword' });
            expect(props.productIds).toEqual({ type: 'keyword' });
        });
    });
    describe('getElasticsearchFieldType', () => {
        it('should return correct mapping for string type', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'string',
                options: {}
            });
            expect(result).toEqual({ type: 'text', fields: { keyword: { type: 'keyword' } } });
        });
        it('should return correct mapping for keyword type', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'keyword',
                options: {}
            });
            expect(result).toEqual({ type: 'keyword' });
        });
        it('should return correct mapping for number type', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'number',
                options: {}
            });
            expect(result).toEqual({ type: 'double' });
        });
        it('should return correct mapping for date type', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'date',
                options: {}
            });
            expect(result).toEqual({ type: 'date' });
        });
        it('should return correct mapping for boolean type', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'boolean',
                options: {}
            });
            expect(result).toEqual({ type: 'boolean' });
        });
        it('should return correct mapping for object with properties', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'object',
                options: {
                    properties: {
                        name: { type: 'string' },
                        age: { type: 'number' }
                    }
                }
            });
            expect(result).toHaveProperty('type', 'object');
            expect(result).toHaveProperty('properties');
        });
        it('should return correct mapping for objectArray with properties', () => {
            const result = SearchModel_1.SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'objectArray',
                options: {
                    properties: {
                        name: { type: 'string' }
                    }
                }
            });
            expect(result).toHaveProperty('type', 'nested');
            expect(result).toHaveProperty('properties');
        });
    });
    describe('createIndex', () => {
        it('should create index with correct mapping', async () => {
            const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({});
            await SearchModel_1.SearchModel.createIndex.call(TestModel);
            expect(mockSearchRequest).toHaveBeenCalledWith('PUT', '/test-index', expect.objectContaining({
                settings: expect.any(Object),
                mappings: expect.any(Object)
            }));
        });
        it('should handle existing index gracefully', async () => {
            const error = new SearchService.SearchError('resource_already_exists_exception');
            error.response = 'Index already exists: resource_already_exists_exception';
            jest.spyOn(SearchService.search, 'searchRequest').mockRejectedValue(error);
            await SearchModel_1.SearchModel.createIndex.call(TestModel);
            expect(jest.spyOn(SearchService.search, 'searchRequest')).toHaveBeenCalled();
        });
        it('should throw error when indexName is not defined', async () => {
            class NoIndexModel extends SearchModel_1.SearchModel {
            }
            await expect(SearchModel_1.SearchModel.createIndex.call(NoIndexModel)).rejects.toThrow('IndexName not defined');
        });
    });
    describe('save', () => {
        it('should save new document', async () => {
            const testId = (0, id_1.id)();
            const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ name: 'Test' });
            await model.save();
            expect(mockSearchRequest).toHaveBeenCalledWith('PUT', expect.stringContaining('/test-index/_doc/'), expect.objectContaining({
                name: 'Test',
                version: 1
            }));
            expect(model.version).toBe(1);
        });
        it('should update existing document', async () => {
            const testId = (0, id_1.id)();
            const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
                _id: testId,
                _version: 2
            });
            const model = new TestModel({
                id: testId,
                name: 'Test',
                version: 1
            });
            model.name = 'Updated';
            await model.save();
            expect(model.version).toBe(2);
        });
        it('should handle version conflicts', async () => {
            const testId = (0, id_1.id)();
            const versionError = new SearchService.VersionConflictError('Version conflict', 2, 1);
            jest.spyOn(SearchService.search, 'searchRequest').mockRejectedValue(versionError);
            const model = new TestModel({
                id: testId,
                name: 'Test',
                version: 1
            });
            await expect(model.save()).rejects.toThrow(/Version conflict/);
        });
        it('should call lifecycle hooks', async () => {
            const testId = (0, id_1.id)();
            jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ name: 'Test' });
            const beforeSaveSpy = jest.spyOn(model, 'beforeSave');
            const afterSaveSpy = jest.spyOn(model, 'afterSave');
            await model.save();
            expect(beforeSaveSpy).toHaveBeenCalled();
            expect(afterSaveSpy).toHaveBeenCalled();
        });
        it('should validate required fields', async () => {
            const model = new TestModel({ id: (0, id_1.id)() });
            model.name = undefined;
            await expect(model.save()).rejects.toThrow("Required field 'name' is missing");
        });
    });
    describe('delete', () => {
        it('should delete document', async () => {
            const testId = (0, id_1.id)();
            const mockSearchRequest = jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({});
            const model = new TestModel({ id: testId, name: 'Test' });
            await model.delete();
            expect(mockSearchRequest).toHaveBeenCalledWith('DELETE', `/test-index/_doc/${testId}`);
        });
        it('should throw error when deleting without ID', async () => {
            const model = new TestModel({ name: 'Test' });
            Object.defineProperty(model, 'id', {
                value: undefined,
                writable: true,
                configurable: true
            });
            await expect(model.delete()).rejects.toThrow('Cannot delete document without ID');
        });
        it('should call lifecycle hooks', async () => {
            const testId = (0, id_1.id)();
            jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({});
            const model = new TestModel({ id: testId, name: 'Test' });
            const beforeDeleteSpy = jest.spyOn(model, 'beforeDelete');
            const afterDeleteSpy = jest.spyOn(model, 'afterDelete');
            await model.delete();
            expect(beforeDeleteSpy).toHaveBeenCalled();
            expect(afterDeleteSpy).toHaveBeenCalled();
        });
    });
    describe('static methods', () => {
        describe('create', () => {
            it('should create and save new instance', async () => {
                const newId = (0, id_1.id)();
                jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
                    _id: newId,
                    _version: 1
                });
                const model = await TestModel.create({ name: 'New Model' });
                expect(model).toBeInstanceOf(TestModel);
                expect(model.name).toBe('New Model');
                expect(model.version).toBe(1);
            });
        });
        describe('find', () => {
            it('should find documents', async () => {
                const id1 = (0, id_1.id)();
                const id2 = (0, id_1.id)();
                const mockQuery = jest.spyOn(SearchService.search, 'query').mockResolvedValue({
                    hits: [
                        { id: id1, name: 'Test 1' },
                        { id: id2, name: 'Test 2' }
                    ],
                    total: 2
                });
                const results = await TestModel.find(['test']);
                expect(mockQuery).toHaveBeenCalledWith('test-index', ['test'], {});
                expect(results).toHaveLength(2);
                expect(results[0]).toBeInstanceOf(TestModel);
            });
            it('should handle search options', async () => {
                const mockQuery = jest.spyOn(SearchService.search, 'query').mockResolvedValue({
                    hits: [],
                    total: 0
                });
                await TestModel.find(['test'], { limit: 10, sort: 'name:desc', page: 2 });
                expect(mockQuery).toHaveBeenCalledWith('test-index', ['test'], { limit: 10, sort: 'name:desc', page: 2 });
            });
        });
        describe('findOne', () => {
            it('should return first matching document', async () => {
                const testId = (0, id_1.id)();
                jest.spyOn(TestModel, 'find').mockResolvedValue([
                    new TestModel({ id: testId, name: 'Test' })
                ]);
                const result = await TestModel.findOne(['test']);
                expect(result).toBeInstanceOf(TestModel);
                expect(result?.id).toBe(testId);
            });
            it('should return null when no match found', async () => {
                jest.spyOn(TestModel, 'find').mockResolvedValue([]);
                const result = await TestModel.findOne(['test']);
                expect(result).toBeNull();
            });
        });
        describe('getById', () => {
            it('should get document by ID', async () => {
                const testId = (0, id_1.id)();
                const mockGetById = jest.spyOn(SearchService.search, 'getById').mockResolvedValue(new TestModel({ id: testId, name: 'Test' }));
                const result = await TestModel.getById(testId);
                expect(mockGetById).toHaveBeenCalledWith(TestModel, testId);
                expect(result).toBeInstanceOf(TestModel);
            });
            it('should return null when document not found', async () => {
                const nonExistentId = (0, id_1.id)();
                jest.spyOn(SearchService.search, 'getById').mockResolvedValue(null);
                const result = await TestModel.getById(nonExistentId);
                expect(result).toBeNull();
            });
        });
    });
    describe('change tracking', () => {
        it('should track field changes', () => {
            const model = new TestModel({ name: 'Initial' });
            model.markFieldChanged('name');
            const changed = model.getChangedFields();
            expect(changed).toContain('name');
        });
        it('should clear changed fields after save', async () => {
            const testId = (0, id_1.id)();
            jest.spyOn(SearchService.search, 'searchRequest').mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ name: 'Test' });
            model.markFieldChanged('name');
            await model.save();
            const changed = model.getChangedFields();
            expect(changed).toHaveLength(0);
        });
    });
    describe('toSearch', () => {
        it('should transform fields correctly', () => {
            const now = new Date();
            const testId = (0, id_1.id)();
            const model = new TestModel({
                id: testId,
                name: 'Test',
                age: 25,
                active: true,
                createdAt: now,
                updatedAt: now,
                version: 1
            });
            const doc = model.toSearch();
            expect(doc.name).toBe('Test');
            expect(doc.age).toBe(25);
            expect(doc.active).toBe(true);
            expect(doc.createdAt).toBe(now.toISOString());
        });
        it('should apply field transformations', () => {
            class TransformModel extends SearchModel_1.SearchModel {
            }
            TransformModel.indexName = 'transform-test';
            __decorate([
                (0, decorators_1.StringType)({ upperCase: true }),
                __metadata("design:type", String)
            ], TransformModel.prototype, "upperField", void 0);
            __decorate([
                (0, decorators_1.StringType)({ lowerCase: true }),
                __metadata("design:type", String)
            ], TransformModel.prototype, "lowerField", void 0);
            __decorate([
                (0, decorators_1.StringType)({ trim: true }),
                __metadata("design:type", String)
            ], TransformModel.prototype, "trimField", void 0);
            const model = new TransformModel({
                id: (0, id_1.id)(),
                upperField: 'test',
                lowerField: 'TEST',
                trimField: '  trimmed  ',
                createdAt: new Date(),
                updatedAt: new Date(),
                version: 1
            });
            const doc = model.toSearch();
            expect(doc.upperField).toBe('TEST');
            expect(doc.lowerField).toBe('test');
            expect(doc.trimField).toBe('trimmed');
        });
    });
});
//# sourceMappingURL=SearchModel.test.js.map