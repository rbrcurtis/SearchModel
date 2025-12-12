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
const SearchModel_1 = require("../SearchModel");
const decorators_1 = require("../../decorators");
describe('ObjectArrayType nested option', () => {
    class TestModelDefault extends SearchModel_1.SearchModel {
    }
    TestModelDefault.indexName = 'test-default';
    __decorate([
        (0, decorators_1.ObjectArrayType)({
            properties: {
                name: { type: 'string' },
                value: { type: 'number' },
            },
        }),
        __metadata("design:type", Array)
    ], TestModelDefault.prototype, "items", void 0);
    class TestModelNested extends SearchModel_1.SearchModel {
    }
    TestModelNested.indexName = 'test-nested';
    __decorate([
        (0, decorators_1.ObjectArrayType)({
            properties: {
                name: { type: 'string' },
                value: { type: 'number' },
            },
            nested: true,
        }),
        __metadata("design:type", Array)
    ], TestModelNested.prototype, "items", void 0);
    class TestModelNotNested extends SearchModel_1.SearchModel {
    }
    TestModelNotNested.indexName = 'test-not-nested';
    __decorate([
        (0, decorators_1.ObjectArrayType)({
            properties: {
                name: { type: 'string' },
                value: { type: 'number' },
            },
            nested: false,
        }),
        __metadata("design:type", Array)
    ], TestModelNotNested.prototype, "items", void 0);
    it('should use object type by default (when nested option is not specified)', () => {
        const mapping = SearchModel_1.SearchModel.generateMapping.call(TestModelDefault);
        const itemsMapping = mapping.mappings.properties.items;
        expect(itemsMapping.type).toBe('object');
        expect(itemsMapping.properties).toBeDefined();
        expect(itemsMapping.properties.name).toEqual({
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
        });
        expect(itemsMapping.properties.value).toEqual({ type: 'double' });
    });
    it('should use nested type when nested: true is specified', () => {
        const mapping = SearchModel_1.SearchModel.generateMapping.call(TestModelNested);
        const itemsMapping = mapping.mappings.properties.items;
        expect(itemsMapping.type).toBe('nested');
        expect(itemsMapping.properties).toBeDefined();
        expect(itemsMapping.properties.name).toEqual({
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
        });
        expect(itemsMapping.properties.value).toEqual({ type: 'double' });
    });
    it('should use object type when nested: false is explicitly specified', () => {
        const mapping = SearchModel_1.SearchModel.generateMapping.call(TestModelNotNested);
        const itemsMapping = mapping.mappings.properties.items;
        expect(itemsMapping.type).toBe('object');
        expect(itemsMapping.properties).toBeDefined();
        expect(itemsMapping.properties.name).toEqual({
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
        });
        expect(itemsMapping.properties.value).toEqual({ type: 'double' });
    });
    it('should still validate object array items correctly', () => {
        const instance = new TestModelDefault({
            id: 'test-1',
            items: [
                { name: 'item1', value: 10 },
                { name: 'item2', value: 20 },
            ],
        });
        expect(instance.items).toHaveLength(2);
        expect(instance.items[0].name).toBe('item1');
        expect(instance.items[0].value).toBe(10);
    });
    it('should throw error for invalid object array items', () => {
        expect(() => {
            new TestModelDefault({
                id: 'test-2',
                items: [{ name: 'valid', value: 10 }, 'invalid-item'],
            });
        }).toThrow();
    });
});
//# sourceMappingURL=ObjectArrayType.nested.test.js.map