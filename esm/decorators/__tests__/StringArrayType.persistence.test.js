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
import { SearchModel } from '../../core/SearchModel';
import { StringArrayType } from '../index';
import { id } from '../../utils/id';
class TestStringArrayModel extends SearchModel {
}
TestStringArrayModel.indexName = 'test-stringarray-index';
__decorate([
    StringArrayType({ required: true }),
    __metadata("design:type", Array)
], TestStringArrayModel.prototype, "requiredTags", void 0);
__decorate([
    StringArrayType(),
    __metadata("design:type", Array)
], TestStringArrayModel.prototype, "optionalCategories", void 0);
__decorate([
    StringArrayType({ default: () => ['default1', 'default2'] }),
    __metadata("design:type", Array)
], TestStringArrayModel.prototype, "defaultValues", void 0);
describe('StringArrayType Persistence', () => {
    describe('Elasticsearch Mapping', () => {
        it('should generate correct mapping for stringArray fields', () => {
            const mapping = SearchModel.generateMapping.call(TestStringArrayModel);
            expect(mapping).toHaveProperty('mappings');
            expect(mapping.mappings).toHaveProperty('properties');
            const properties = mapping.mappings.properties;
            expect(properties.requiredTags).toEqual({
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
            });
            expect(properties.optionalCategories).toEqual({
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
            });
            expect(properties.defaultValues).toEqual({
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
            });
        });
        it('should use getElasticsearchFieldType correctly for stringArray', () => {
            const result = SearchModel.getElasticsearchFieldType({
                propertyKey: 'testArray',
                type: 'stringArray',
                options: {}
            });
            expect(result).toEqual({
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
            });
        });
    });
    describe('toSearch Method', () => {
        it('should return string arrays correctly in toSearch output', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['tag1', 'tag2', 'tag3'],
                optionalCategories: ['cat1', 'cat2']
            });
            const searchDoc = model.toSearch();
            expect(searchDoc.requiredTags).toEqual(['tag1', 'tag2', 'tag3']);
            expect(searchDoc.optionalCategories).toEqual(['cat1', 'cat2']);
            expect(Array.isArray(searchDoc.requiredTags)).toBe(true);
            expect(Array.isArray(searchDoc.optionalCategories)).toBe(true);
        });
        it('should handle empty arrays in toSearch', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: [],
                optionalCategories: []
            });
            const searchDoc = model.toSearch();
            expect(searchDoc.requiredTags).toEqual([]);
            expect(searchDoc.optionalCategories).toEqual([]);
            expect(Array.isArray(searchDoc.requiredTags)).toBe(true);
            expect(Array.isArray(searchDoc.optionalCategories)).toBe(true);
        });
        it('should return string arrays as-is since validation ensures strings', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['tag1', 'tag2', 'tag3'],
                optionalCategories: ['cat1', 'cat2']
            });
            const searchDoc = model.toSearch();
            expect(searchDoc.requiredTags).toEqual(['tag1', 'tag2', 'tag3']);
            expect(searchDoc.optionalCategories).toEqual(['cat1', 'cat2']);
            expect(typeof searchDoc.requiredTags[0]).toBe('string');
            expect(typeof searchDoc.requiredTags[1]).toBe('string');
            expect(typeof searchDoc.requiredTags[2]).toBe('string');
        });
        it('should handle default values in toSearch', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['tag1']
            });
            const searchDoc = model.toSearch();
            expect(searchDoc.defaultValues).toEqual(['default1', 'default2']);
            expect(Array.isArray(searchDoc.defaultValues)).toBe(true);
        });
        it('should return correct values in toSearch after setting string arrays post-creation', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['initial']
            });
            model.requiredTags = ['post-creation1', 'post-creation2'];
            model.optionalCategories = ['optional1', 'optional2', 'optional3'];
            const searchDoc = model.toSearch();
            expect(searchDoc.requiredTags).toEqual(['post-creation1', 'post-creation2']);
            expect(searchDoc.optionalCategories).toEqual(['optional1', 'optional2', 'optional3']);
            expect(Array.isArray(searchDoc.requiredTags)).toBe(true);
            expect(Array.isArray(searchDoc.optionalCategories)).toBe(true);
        });
        it('should handle setting empty arrays after creation in toSearch', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['initial1', 'initial2'],
                optionalCategories: ['cat1']
            });
            model.requiredTags = [];
            model.optionalCategories = [];
            const searchDoc = model.toSearch();
            expect(searchDoc.requiredTags).toEqual([]);
            expect(searchDoc.optionalCategories).toEqual([]);
            expect(Array.isArray(searchDoc.requiredTags)).toBe(true);
            expect(Array.isArray(searchDoc.optionalCategories)).toBe(true);
        });
    });
    describe('Change Tracking', () => {
        it('should track changes when setting stringArray field', () => {
            const model = new TestStringArrayModel();
            expect(model['getChangedFields']()).toHaveLength(0);
            model.requiredTags = ['tag1', 'tag2'];
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('requiredTags');
            expect(changedFields).toHaveLength(1);
        });
        it('should track changes when updating stringArray field', () => {
            const model = new TestStringArrayModel({
                requiredTags: ['initial1', 'initial2']
            });
            model['clearChangedFields']();
            expect(model['getChangedFields']()).toHaveLength(0);
            model.requiredTags = ['updated1', 'updated2', 'updated3'];
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('requiredTags');
            expect(changedFields).toHaveLength(1);
        });
        it('should track changes for multiple stringArray fields', () => {
            const model = new TestStringArrayModel();
            model.requiredTags = ['tag1', 'tag2'];
            model.optionalCategories = ['cat1', 'cat2'];
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('requiredTags');
            expect(changedFields).toContain('optionalCategories');
            expect(changedFields).toHaveLength(2);
        });
        it('should not track changes when setting same array value', () => {
            const testId = id();
            const initialArray = ['tag1', 'tag2'];
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: initialArray
            });
            model['clearChangedFields']();
            expect(model['getChangedFields']()).toHaveLength(0);
            model.requiredTags = initialArray;
            expect(model['getChangedFields']()).toContain('requiredTags');
        });
        it('should track changes when modifying array contents', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['tag1', 'tag2']
            });
            model['clearChangedFields']();
            expect(model['getChangedFields']()).toHaveLength(0);
            model.requiredTags = ['tag1', 'tag3'];
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('requiredTags');
            expect(changedFields).toHaveLength(1);
        });
        it('should track changes when setting stringArray field to empty array', () => {
            const model = new TestStringArrayModel({
                requiredTags: ['tag1', 'tag2']
            });
            model['clearChangedFields']();
            model.requiredTags = [];
            const changedFields = model['getChangedFields']();
            expect(changedFields).toContain('requiredTags');
            expect(changedFields).toHaveLength(1);
        });
    });
    describe('Validation', () => {
        it('should validate that field is an array', () => {
            const model = new TestStringArrayModel();
            expect(() => {
                model.requiredTags = 'not an array';
            }).toThrow("Field 'requiredTags' must be an array, got string");
            expect(() => {
                model.optionalCategories = 123;
            }).toThrow("Field 'optionalCategories' must be an array, got number");
            expect(() => {
                model.requiredTags = { not: 'array' };
            }).toThrow("Field 'requiredTags' must be an array, got object");
        });
        it('should validate that array contains only strings', () => {
            const model = new TestStringArrayModel();
            expect(() => {
                model.requiredTags = ['valid', 123, 'also valid'];
            }).toThrow("Field 'requiredTags' must be an array of strings, found number at index 1");
            expect(() => {
                model.optionalCategories = ['valid', true, 'also valid'];
            }).toThrow("Field 'optionalCategories' must be an array of strings, found boolean at index 1");
            expect(() => {
                model.requiredTags = ['valid', null, 'also valid'];
            }).toThrow("Field 'requiredTags' must be an array of strings, found object at index 1");
        });
        it('should allow empty arrays', () => {
            const model = new TestStringArrayModel();
            expect(() => {
                model.requiredTags = [];
                model.optionalCategories = [];
            }).not.toThrow();
            expect([...model.requiredTags]).toEqual([]);
            expect([...model.optionalCategories]).toEqual([]);
        });
        it('should allow arrays with valid strings', () => {
            const model = new TestStringArrayModel();
            expect(() => {
                model.requiredTags = ['tag1', 'tag2', 'tag3'];
                model.optionalCategories = ['category1', 'category2'];
            }).not.toThrow();
            expect([...model.requiredTags]).toEqual(['tag1', 'tag2', 'tag3']);
            expect([...model.optionalCategories]).toEqual(['category1', 'category2']);
        });
    });
    describe('Persistence Operations', () => {
        it('should initialize stringArray fields from constructor data', () => {
            const testId = id();
            const model = new TestStringArrayModel({
                id: testId,
                requiredTags: ['constructor1', 'constructor2'],
                optionalCategories: ['cat1', 'cat2']
            });
            expect([...model.requiredTags]).toEqual(['constructor1', 'constructor2']);
            expect([...model.optionalCategories]).toEqual(['cat1', 'cat2']);
            expect(model.id).toBe(testId);
        });
        it('should apply default values for stringArray fields', () => {
            const model = new TestStringArrayModel({
                requiredTags: ['tag1']
            });
            expect([...model.defaultValues]).toEqual(['default1', 'default2']);
        });
        it('should handle undefined and null values correctly', () => {
            const model = new TestStringArrayModel();
            model.optionalCategories = undefined;
            expect(model.optionalCategories).toBeUndefined();
            model.optionalCategories = null;
            expect(model.optionalCategories).toBeNull();
        });
        it('should preserve array references correctly', () => {
            const originalArray = ['tag1', 'tag2'];
            const model = new TestStringArrayModel({
                requiredTags: originalArray
            });
            expect([...model.requiredTags]).toEqual(['tag1', 'tag2']);
        });
        it('should clear changed fields correctly after operations', () => {
            const model = new TestStringArrayModel();
            model.requiredTags = ['tag1', 'tag2'];
            model.optionalCategories = ['cat1'];
            expect(model['getChangedFields']()).toHaveLength(2);
            model['clearChangedFields']();
            expect(model['getChangedFields']()).toHaveLength(0);
            model.requiredTags = ['new1', 'new2'];
            expect(model['getChangedFields']()).toHaveLength(1);
            expect(model['getChangedFields']()).toContain('requiredTags');
        });
    });
});
//# sourceMappingURL=StringArrayType.persistence.test.js.map