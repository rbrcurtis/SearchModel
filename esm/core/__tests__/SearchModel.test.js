var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import 'reflect-metadata';
import { SearchModel } from '../SearchModel';
import { StringType, NumberType, DateType, BooleanType } from '../../decorators';
import { search, SearchError, VersionConflictError } from '../SearchService';
import { id } from '../../utils/id';
jest.mock('../SearchService', () => {
    const actual = jest.requireActual('../SearchService');
    return {
        ...actual,
        search: {
            searchRequest: jest.fn(),
            query: jest.fn(),
            getById: jest.fn()
        }
    };
});
const mockedSearch = search;
class TestModel extends SearchModel {
}
TestModel.indexName = 'test-index';
__decorate([
    StringType({ required: true }),
    __metadata("design:type", String)
], TestModel.prototype, "name", void 0);
__decorate([
    NumberType(),
    __metadata("design:type", Number)
], TestModel.prototype, "score", void 0);
__decorate([
    DateType(),
    __metadata("design:type", Date)
], TestModel.prototype, "birthDate", void 0);
__decorate([
    BooleanType(),
    __metadata("design:type", Boolean)
], TestModel.prototype, "isActive", void 0);
class ModelWithHooks extends SearchModel {
    constructor() {
        super(...arguments);
        this.beforeSaveCalled = false;
        this.afterSaveCalled = false;
        this.beforeDeleteCalled = false;
        this.afterDeleteCalled = false;
    }
    async beforeSave(event) {
        this.beforeSaveCalled = true;
    }
    async afterSave(event) {
        this.afterSaveCalled = true;
    }
    async beforeDelete(event) {
        this.beforeDeleteCalled = true;
    }
    async afterDelete(event) {
        this.afterDeleteCalled = true;
    }
}
ModelWithHooks.indexName = 'hooks-index';
__decorate([
    StringType(),
    __metadata("design:type", String)
], ModelWithHooks.prototype, "name", void 0);
describe('SearchModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedSearch.searchRequest.mockReset();
        mockedSearch.query.mockReset();
        mockedSearch.getById.mockReset();
    });
    describe('constructor', () => {
        it('should initialize with default values', () => {
            const model = new TestModel();
            expect(model.id).toBeDefined();
            expect(model.createdAt).toBeInstanceOf(Date);
            expect(model.updatedAt).toBeInstanceOf(Date);
            expect(model.version).toBe(1);
        });
        it('should initialize with provided values', () => {
            const testId = id();
            const data = {
                id: testId,
                name: 'Test Name',
                score: 100,
                birthDate: new Date('1990-01-01'),
                isActive: true,
                version: 2
            };
            const model = new TestModel(data);
            expect(model.id).toBe(testId);
            expect(model.name).toBe('Test Name');
            expect(model.score).toBe(100);
            expect(model.birthDate).toEqual(new Date('1990-01-01'));
            expect(model.isActive).toBe(true);
            expect(model.version).toBe(2);
        });
        it('should parse date strings', () => {
            const dateString = '2023-01-01T00:00:00.000Z';
            const model = new TestModel({
                createdAt: dateString,
                updatedAt: dateString
            });
            expect(model.createdAt).toBeInstanceOf(Date);
            expect(model.updatedAt).toBeInstanceOf(Date);
        });
    });
    describe('fromJSON', () => {
        it('should create instance from JSON data', () => {
            const testId = id();
            const data = {
                id: testId,
                name: 'Test',
                score: 50
            };
            const model = TestModel.fromJSON(data);
            expect(model).toBeInstanceOf(TestModel);
            expect(model.id).toBe(testId);
            expect(model.name).toBe('Test');
            expect(model.score).toBe(50);
        });
        it('should return existing instance if passed', () => {
            const existing = new TestModel({ name: 'Existing' });
            const result = TestModel.fromJSON(existing);
            expect(result).toBe(existing);
        });
    });
    describe('generateMapping', () => {
        it('should generate correct Elasticsearch mapping', () => {
            const mapping = SearchModel.generateMapping.call(TestModel);
            expect(mapping).toHaveProperty('mappings');
            expect(mapping.mappings).toHaveProperty('properties');
            const properties = mapping.mappings.properties;
            expect(properties.id).toEqual({ type: 'keyword', fields: { keyword: { type: 'keyword' } } });
            expect(properties.name).toEqual({
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
            });
            expect(properties.score).toEqual({ type: 'double' });
            expect(properties.birthDate).toEqual({ type: 'date' });
            expect(properties.isActive).toEqual({ type: 'boolean' });
        });
    });
    describe('getElasticsearchFieldType', () => {
        it('should convert string type correctly', () => {
            const result = SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'string',
                options: {}
            });
            expect(result).toEqual({
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
            });
        });
        it('should convert keyword type correctly', () => {
            const result = SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'keyword',
                options: {}
            });
            expect(result).toEqual({ type: 'keyword', fields: { keyword: { type: 'keyword' } } });
        });
        it('should convert number type correctly', () => {
            const result = SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'number',
                options: {}
            });
            expect(result).toEqual({ type: 'double' });
        });
        it('should convert date type correctly', () => {
            const result = SearchModel.getElasticsearchFieldType({
                propertyKey: 'test',
                type: 'date',
                options: {}
            });
            expect(result).toEqual({ type: 'date' });
        });
    });
    describe('createIndex', () => {
        it('should create index with correct mapping', async () => {
            mockedSearch.searchRequest.mockResolvedValue({});
            await SearchModel.createIndex.call(TestModel);
            expect(search.searchRequest).toHaveBeenCalledWith('PUT', '/test-index', expect.objectContaining({
                settings: expect.any(Object),
                mappings: expect.any(Object)
            }));
        });
        it('should handle existing index gracefully', async () => {
            const error = new SearchError('resource_already_exists_exception');
            error.response = 'Index already exists: resource_already_exists_exception';
            mockedSearch.searchRequest.mockRejectedValue(error);
            await SearchModel.createIndex.call(TestModel);
            expect(search.searchRequest).toHaveBeenCalled();
        });
        it('should throw error when indexName is not defined', async () => {
            class NoIndexModel extends SearchModel {
            }
            await expect(SearchModel.createIndex.call(NoIndexModel))
                .rejects.toThrow('IndexName not defined for NoIndexModel');
        });
    });
    describe('save', () => {
        it('should save new document', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ id: testId, name: 'Test' });
            const result = await model.save();
            expect(search.searchRequest).toHaveBeenCalledWith('PUT', `/test-index/_doc/${testId}?refresh=wait_for`, expect.objectContaining({
                id: testId,
                name: 'Test'
            }));
            expect(result).toBe(model);
        });
        it('should update existing document', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 2
            });
            const model = new TestModel({
                id: testId,
                name: 'Test',
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await model.save();
            expect(search.searchRequest).toHaveBeenCalled();
            expect(model.version).toBe(2);
        });
        it('should handle version conflicts', async () => {
            const testId = id();
            const versionError = new VersionConflictError('Version conflict', 2, 1);
            mockedSearch.searchRequest.mockRejectedValue(versionError);
            const model = new TestModel({
                id: testId,
                name: 'Test',
                version: 1
            });
            await expect(model.save()).rejects.toThrow(/Version conflict/);
        });
        it('should call lifecycle hooks', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new ModelWithHooks({ id: testId, name: 'Test' });
            expect(model.beforeSaveCalled).toBe(false);
            expect(model.afterSaveCalled).toBe(false);
            await model.save();
            expect(model.beforeSaveCalled).toBe(true);
            expect(model.afterSaveCalled).toBe(true);
        });
        it('should respect wait option', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ id: testId, name: 'Test' });
            await model.save({ wait: false });
            expect(search.searchRequest).toHaveBeenCalledWith('PUT', `/test-index/_doc/${testId}`, expect.any(Object));
            mockedSearch.searchRequest.mockClear();
            await model.save();
            expect(search.searchRequest).toHaveBeenCalledWith('PUT', `/test-index/_doc/${testId}?refresh=wait_for`, expect.any(Object));
        });
    });
    describe('delete', () => {
        it('should delete document', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({});
            const model = new TestModel({ id: testId, name: 'Test' });
            await model.delete();
            expect(search.searchRequest).toHaveBeenCalledWith('DELETE', `/test-index/_doc/${testId}`);
        });
        it('should throw error when id is missing', async () => {
            const model = new TestModel();
            model.id = undefined;
            await expect(model.delete()).rejects.toThrow('Cannot delete document without ID');
        });
        it('should throw error when indexName is not defined', async () => {
            class NoIndexModel extends SearchModel {
            }
            const model = new NoIndexModel({ id: id() });
            await expect(model.delete()).rejects.toThrow('IndexName not defined');
        });
        it('should call lifecycle hooks', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({});
            const model = new ModelWithHooks({ id: testId, name: 'Test' });
            expect(model.beforeDeleteCalled).toBe(false);
            expect(model.afterDeleteCalled).toBe(false);
            await model.delete();
            expect(model.beforeDeleteCalled).toBe(true);
            expect(model.afterDeleteCalled).toBe(true);
        });
    });
    describe('static methods', () => {
        describe('create', () => {
            it('should create and save new document', async () => {
                const testId = id();
                mockedSearch.searchRequest.mockResolvedValue({
                    _id: testId,
                    _version: 1
                });
                const result = await TestModel.create({ id: testId, name: 'New' });
                expect(result).toBeInstanceOf(TestModel);
                expect(result.name).toBe('New');
                expect(search.searchRequest).toHaveBeenCalled();
            });
            it('should pass options to save', async () => {
                const testId = id();
                mockedSearch.searchRequest.mockResolvedValue({
                    _id: testId,
                    _version: 1
                });
                await TestModel.create({ id: testId, name: 'New' }, { wait: false });
                expect(search.searchRequest).toHaveBeenCalledWith('PUT', expect.stringMatching(/^\/test-index\/_doc\/[^?]+$/), expect.any(Object));
            });
        });
        describe('find', () => {
            it('should find documents', async () => {
                mockedSearch.query.mockResolvedValue({
                    hits: [
                        { id: id(), name: 'Result 1' },
                        { id: id(), name: 'Result 2' }
                    ],
                    total: 2
                });
                const results = await TestModel.find(['name:Test']);
                expect(search.query).toHaveBeenCalledWith('test-index', ['name:Test'], {});
                expect(results).toHaveLength(2);
                expect(results[0]).toBeInstanceOf(TestModel);
            });
            it('should pass options to query', async () => {
                mockedSearch.query.mockResolvedValue({
                    hits: [],
                    total: 0
                });
                await TestModel.find(['test'], { limit: 10, sort: 'name:desc' });
                expect(search.query).toHaveBeenCalledWith('test-index', ['test'], { limit: 10, sort: 'name:desc' });
            });
        });
        describe('findWithTotal', () => {
            it('should return hits and total', async () => {
                const hits = [
                    { id: id(), name: 'Result 1' },
                    { id: id(), name: 'Result 2' }
                ];
                mockedSearch.query.mockResolvedValue({ hits, total: 42 });
                const result = await TestModel.findWithTotal(['test']);
                expect(result.hits).toEqual(hits);
                expect(result.total).toBe(42);
            });
        });
        describe('findOne', () => {
            it('should find first matching document', async () => {
                const testDoc = { id: id(), name: 'First' };
                jest.spyOn(TestModel, 'find').mockResolvedValue([
                    new TestModel(testDoc)
                ]);
                const result = await TestModel.findOne(['name:First']);
                expect(result).toBeInstanceOf(TestModel);
                expect(result?.name).toBe('First');
            });
            it('should return null when no documents found', async () => {
                jest.spyOn(TestModel, 'find').mockResolvedValue([]);
                const result = await TestModel.findOne(['name:NotFound']);
                expect(result).toBeNull();
            });
        });
        describe('getById', () => {
            it('should get document by ID', async () => {
                const testId = id();
                mockedSearch.getById.mockResolvedValue(new TestModel({ id: testId, name: 'Test' }));
                const result = await TestModel.getById(testId);
                expect(search.getById).toHaveBeenCalledWith(TestModel, testId);
                expect(result).toBeInstanceOf(TestModel);
            });
            it('should return null when document not found', async () => {
                const nonExistentId = id();
                mockedSearch.getById.mockResolvedValue(null);
                const result = await TestModel.getById(nonExistentId);
                expect(result).toBeNull();
            });
        });
    });
    describe('change tracking', () => {
        it('should track field changes', () => {
            const model = new TestModel();
            model['markFieldChanged']('name');
            model['markFieldChanged']('score');
            const changed = model['getChangedFields']();
            expect(changed).toContain('name');
            expect(changed).toContain('score');
        });
        it('should clear changed fields after save', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ id: testId, name: 'Test' });
            model['markFieldChanged']('name');
            expect(model['getChangedFields']()).toContain('name');
            await model.save();
            expect(model['getChangedFields']()).toHaveLength(0);
        });
    });
    describe('toJSON', () => {
        it('should convert model to plain object', () => {
            const testId = id();
            const model = new TestModel({
                id: testId,
                name: 'Test',
                score: 100,
                isActive: true
            });
            const json = model.toJSON();
            expect(json).toEqual(expect.objectContaining({
                id: testId,
                name: 'Test',
                score: 100,
                isActive: true
            }));
        });
    });
    describe('toSearch', () => {
        it('should generate Elasticsearch document', () => {
            const testId = id();
            const model = new TestModel({
                id: testId,
                name: 'Test',
                score: 100
            });
            const doc = model.toSearch();
            expect(doc).toHaveProperty('id', testId);
            expect(doc).toHaveProperty('name', 'Test');
            expect(doc).toHaveProperty('score', 100);
        });
    });
    describe('toString', () => {
        it('should return JSON string representation', () => {
            const model = new TestModel({ name: 'Test' });
            const str = model.toString();
            expect(typeof str).toBe('string');
            const parsed = JSON.parse(str);
            expect(parsed).toHaveProperty('name', 'Test');
        });
    });
});
//# sourceMappingURL=SearchModel.test.js.map