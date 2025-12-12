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
require("reflect-metadata");
const SearchModel_1 = require("../SearchModel");
const decorators_1 = require("../../decorators");
const id_1 = require("../../utils/id");
const SearchService_1 = require("../SearchService");
vi.mock('../SearchService', async () => {
    const actual = await vi.importActual('../SearchService');
    return {
        ...actual,
        search: {
            searchRequest: vi.fn(),
            query: vi.fn(),
            getById: vi.fn()
        }
    };
});
class TestModelWithDefaults extends SearchModel_1.SearchModel {
}
TestModelWithDefaults.indexName = 'test-defaults-index';
__decorate([
    (0, decorators_1.StringType)({ default: () => 'default-string' }),
    __metadata("design:type", String)
], TestModelWithDefaults.prototype, "stringField", void 0);
__decorate([
    (0, decorators_1.NumberType)({ default: () => 42 }),
    __metadata("design:type", Number)
], TestModelWithDefaults.prototype, "numberField", void 0);
__decorate([
    (0, decorators_1.DateType)({ default: () => new Date('2023-01-01') }),
    __metadata("design:type", Date)
], TestModelWithDefaults.prototype, "dateField", void 0);
__decorate([
    (0, decorators_1.BooleanType)({ default: () => true }),
    __metadata("design:type", Boolean)
], TestModelWithDefaults.prototype, "booleanField", void 0);
__decorate([
    (0, decorators_1.StringArrayType)({ default: () => ['item1', 'item2'] }),
    __metadata("design:type", Array)
], TestModelWithDefaults.prototype, "stringArrayField", void 0);
__decorate([
    (0, decorators_1.KeywordType)({ default: () => 'default-keyword' }),
    __metadata("design:type", String)
], TestModelWithDefaults.prototype, "keywordField", void 0);
__decorate([
    (0, decorators_1.StringMapType)({ default: () => ({ key1: 'value1', key2: 'value2' }) }),
    __metadata("design:type", Object)
], TestModelWithDefaults.prototype, "stringMapField", void 0);
__decorate([
    (0, decorators_1.ObjectType)({
        properties: {
            nested: { type: 'string' }
        },
        default: () => ({ nested: 'default-nested' })
    }),
    __metadata("design:type", Object)
], TestModelWithDefaults.prototype, "objectField", void 0);
__decorate([
    (0, decorators_1.ObjectArrayType)({
        properties: {
            item: { type: 'string' }
        },
        default: () => [{ item: 'default-item1' }, { item: 'default-item2' }]
    }),
    __metadata("design:type", Array)
], TestModelWithDefaults.prototype, "objectArrayField", void 0);
class TestModelPartialDefaults extends SearchModel_1.SearchModel {
}
TestModelPartialDefaults.indexName = 'test-partial-defaults-index';
__decorate([
    (0, decorators_1.StringType)({ default: () => 'has-default' }),
    __metadata("design:type", String)
], TestModelPartialDefaults.prototype, "withDefault", void 0);
__decorate([
    (0, decorators_1.StringType)(),
    __metadata("design:type", String)
], TestModelPartialDefaults.prototype, "withoutDefault", void 0);
__decorate([
    (0, decorators_1.NumberType)({ default: () => 100 }),
    __metadata("design:type", Number)
], TestModelPartialDefaults.prototype, "numberWithDefault", void 0);
__decorate([
    (0, decorators_1.NumberType)(),
    __metadata("design:type", Number)
], TestModelPartialDefaults.prototype, "numberWithoutDefault", void 0);
class TestModelRequiredWithDefaults extends SearchModel_1.SearchModel {
}
TestModelRequiredWithDefaults.indexName = 'test-required-defaults-index';
__decorate([
    (0, decorators_1.StringType)({ required: true, default: () => 'required-default' }),
    __metadata("design:type", String)
], TestModelRequiredWithDefaults.prototype, "requiredWithDefault", void 0);
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], TestModelRequiredWithDefaults.prototype, "requiredWithoutDefault", void 0);
describe('SearchModel Defaults', () => {
    describe('Constructor Behavior (No Defaults)', () => {
        it('should NOT apply defaults in constructor - defaults applied during save', () => {
            const model = new TestModelWithDefaults();
            expect(model.stringField).toBeUndefined();
            expect(model.numberField).toBeUndefined();
            expect(model.dateField).toBeUndefined();
            expect(model.booleanField).toBeUndefined();
            expect(model.stringArrayField).toBeUndefined();
            expect(model.keywordField).toBeUndefined();
            expect(model.stringMapField).toBeUndefined();
            expect(model.objectField).toBeUndefined();
            expect(model.objectArrayField).toBeUndefined();
        });
        it('should preserve provided values in constructor', () => {
            const model = new TestModelWithDefaults({
                stringField: 'custom-value',
                numberField: 999,
                booleanField: false
            });
            expect(model.stringField).toBe('custom-value');
            expect(model.numberField).toBe(999);
            expect(model.booleanField).toBe(false);
            expect(model.dateField).toBeUndefined();
            expect(model.keywordField).toBeUndefined();
        });
        it('should preserve null values in constructor', () => {
            const model = new TestModelWithDefaults({
                stringField: null,
                numberField: null
            });
            expect(model.stringField).toBeNull();
            expect(model.numberField).toBeNull();
            expect(model.booleanField).toBeUndefined();
        });
        it('should not override falsy values with defaults', () => {
            const model = new TestModelWithDefaults({
                stringField: '',
                numberField: 0,
                booleanField: false,
                stringArrayField: []
            });
            expect(model.stringField).toBe('');
            expect(model.numberField).toBe(0);
            expect(model.booleanField).toBe(false);
            expect([...model.stringArrayField]).toEqual([]);
        });
        it('should leave fields undefined when no values provided', () => {
            const model = new TestModelPartialDefaults();
            expect(model.withDefault).toBeUndefined();
            expect(model.numberWithDefault).toBeUndefined();
            expect(model.withoutDefault).toBeUndefined();
            expect(model.numberWithoutDefault).toBeUndefined();
        });
        it('should preserve provided values without applying other defaults', () => {
            const model = new TestModelRequiredWithDefaults({
                requiredWithoutDefault: 'provided-value'
            });
            expect(model.requiredWithDefault).toBeUndefined();
            expect(model.requiredWithoutDefault).toBe('provided-value');
        });
    });
    describe('fromJSON Behavior (No Defaults)', () => {
        it('should NOT apply defaults when loading from JSON', () => {
            const model = TestModelWithDefaults.fromJSON({});
            expect(model.stringField).toBeUndefined();
            expect(model.numberField).toBeUndefined();
            expect(model.dateField).toBeUndefined();
            expect(model.booleanField).toBeUndefined();
            expect(model.stringArrayField).toBeUndefined();
            expect(model.keywordField).toBeUndefined();
            expect(model.stringMapField).toBeUndefined();
            expect(model.objectField).toBeUndefined();
            expect(model.objectArrayField).toBeUndefined();
        });
        it('should preserve provided values without applying defaults to missing fields', () => {
            const model = TestModelWithDefaults.fromJSON({
                id: (0, id_1.id)(),
                version: 2,
                stringField: 'from-database'
            });
            expect(model.stringField).toBe('from-database');
            expect(model.numberField).toBeUndefined();
            expect(model.booleanField).toBeUndefined();
            expect(model.keywordField).toBeUndefined();
        });
        it('should preserve null values from database', () => {
            const model = TestModelWithDefaults.fromJSON({
                id: (0, id_1.id)(),
                version: 2,
                stringField: null,
                numberField: null
            });
            expect(model.stringField).toBeNull();
            expect(model.numberField).toBeNull();
            expect(model.booleanField).toBeUndefined();
        });
        it('should handle falsy values from database correctly', () => {
            const model = TestModelWithDefaults.fromJSON({
                id: (0, id_1.id)(),
                version: 2,
                stringField: '',
                numberField: 0,
                booleanField: false,
                stringArrayField: []
            });
            expect(model.stringField).toBe('');
            expect(model.numberField).toBe(0);
            expect(model.booleanField).toBe(false);
            expect([...model.stringArrayField]).toEqual([]);
        });
        it('should load old records without applying defaults to new fields', () => {
            const oldRecord = {
                id: (0, id_1.id)(),
                version: 5,
                createdAt: '2022-01-01T00:00:00.000Z',
                updatedAt: '2022-06-01T00:00:00.000Z',
                stringField: 'existing-value'
            };
            const model = TestModelWithDefaults.fromJSON(oldRecord);
            expect(model.stringField).toBe('existing-value');
            expect(model.version).toBe(5);
            expect(model.numberField).toBeUndefined();
            expect(model.booleanField).toBeUndefined();
            expect(model.keywordField).toBeUndefined();
            expect(model.stringArrayField).toBeUndefined();
        });
    });
    describe('Constructor Field Independence', () => {
        it('should create independent instances without shared state', () => {
            const model1 = new TestModelWithDefaults({
                stringArrayField: ['item1', 'item2'],
                stringMapField: { key1: 'value1', key2: 'value2' },
                objectField: { nested: 'original' },
                objectArrayField: [{ item: 'item1' }]
            });
            const model2 = new TestModelWithDefaults({
                stringArrayField: ['item1', 'item2'],
                stringMapField: { key1: 'value1', key2: 'value2' },
                objectField: { nested: 'original' },
                objectArrayField: [{ item: 'item1' }]
            });
            model1.stringArrayField = [...model1.stringArrayField, 'item3'];
            model1.stringMapField = { ...model1.stringMapField, key3: 'value3' };
            model1.objectField = { nested: 'modified' };
            model1.objectArrayField = [...model1.objectArrayField, { item: 'new-item' }];
            expect([...model2.stringArrayField]).toEqual(['item1', 'item2']);
            expect(model2.stringMapField).toEqual({ key1: 'value1', key2: 'value2' });
            expect(model2.objectField).toEqual({ nested: 'original' });
            expect([...model2.objectArrayField]).toEqual([{ item: 'item1' }]);
        });
    });
    describe('Save Method Defaults', () => {
        it('should apply defaults during save for new documents', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: 'test-id',
                _version: 1
            });
            const model = new TestModelPartialDefaults({
                withoutDefault: 'provided-value'
            });
            await model.save();
            expect(model.withDefault).toBe('has-default');
            expect(model.withoutDefault).toBe('provided-value');
            const savedData = vi.mocked(SearchService_1.search.searchRequest).mock.calls[0][2];
            expect(savedData.withDefault).toBe('has-default');
            expect(savedData.withoutDefault).toBe('provided-value');
        });
    });
});
//# sourceMappingURL=SearchModel.defaults.test.js.map