var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { SearchModel } from '../SearchModel';
import { ObjectArrayType } from '../../decorators';
describe('ObjectArrayType - nested within nested arrays', () => {
    class TestModelNestedArrays extends SearchModel {
    }
    TestModelNestedArrays.indexName = 'test-nested-arrays';
    __decorate([
        ObjectArrayType({
            properties: {
                name: { type: 'string' },
                tags: { type: 'stringArray' },
                children: {
                    type: 'objectArray',
                    options: {
                        properties: {
                            childName: { type: 'string' },
                            childValue: { type: 'number' },
                        },
                    },
                },
            },
        }),
        __metadata("design:type", Array)
    ], TestModelNestedArrays.prototype, "items", void 0);
    class TestModelNestedOuter extends SearchModel {
    }
    TestModelNestedOuter.indexName = 'test-nested-outer';
    __decorate([
        ObjectArrayType({
            properties: {
                name: { type: 'string' },
                children: {
                    type: 'objectArray',
                    options: {
                        properties: {
                            childName: { type: 'string' },
                            childValue: { type: 'number' },
                        },
                    },
                },
            },
            nested: true,
        }),
        __metadata("design:type", Array)
    ], TestModelNestedOuter.prototype, "items", void 0);
    class TestModelNestedInner extends SearchModel {
    }
    TestModelNestedInner.indexName = 'test-nested-inner';
    __decorate([
        ObjectArrayType({
            properties: {
                name: { type: 'string' },
                children: {
                    type: 'objectArray',
                    options: {
                        properties: {
                            childName: { type: 'string' },
                            childValue: { type: 'number' },
                        },
                        nested: true,
                    },
                },
            },
        }),
        __metadata("design:type", Array)
    ], TestModelNestedInner.prototype, "items", void 0);
    it('should handle objectArray within objectArray with default (object) types', () => {
        const mapping = SearchModel.generateMapping.call(TestModelNestedArrays);
        const itemsMapping = mapping.mappings.properties.items;
        expect(itemsMapping.type).toBe('object');
        expect(itemsMapping.properties).toBeDefined();
        expect(itemsMapping.properties.name).toEqual({
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
        });
        expect(itemsMapping.properties.tags).toEqual({
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
        });
        expect(itemsMapping.properties.children).toBeDefined();
        expect(itemsMapping.properties.children.type).toBe('object');
        expect(itemsMapping.properties.children.properties).toBeDefined();
        expect(itemsMapping.properties.children.properties.childName).toEqual({
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
        });
        expect(itemsMapping.properties.children.properties.childValue).toEqual({
            type: 'double',
        });
    });
    it('should use nested type on outer array when specified', () => {
        const mapping = SearchModel.generateMapping.call(TestModelNestedOuter);
        const itemsMapping = mapping.mappings.properties.items;
        expect(itemsMapping.type).toBe('nested');
        expect(itemsMapping.properties.children.type).toBe('object');
    });
    it('should use nested type on inner array when specified', () => {
        const mapping = SearchModel.generateMapping.call(TestModelNestedInner);
        const itemsMapping = mapping.mappings.properties.items;
        expect(itemsMapping.type).toBe('object');
        expect(itemsMapping.properties.children.type).toBe('nested');
    });
    it('should validate nested objectArray data correctly', () => {
        const instance = new TestModelNestedArrays({
            id: 'test-1',
            items: [
                {
                    name: 'item1',
                    tags: ['tag1', 'tag2'],
                    children: [
                        { childName: 'child1', childValue: 10 },
                        { childName: 'child2', childValue: 20 },
                    ],
                },
                {
                    name: 'item2',
                    tags: ['tag3'],
                    children: [{ childName: 'child3', childValue: 30 }],
                },
            ],
        });
        expect(instance.items).toHaveLength(2);
        expect(instance.items[0].children).toHaveLength(2);
        expect(instance.items[0].children[0].childName).toBe('child1');
        expect(instance.items[0].children[0].childValue).toBe(10);
    });
    it('should throw error for invalid nested objectArray items', () => {
        expect(() => {
            new TestModelNestedArrays({
                id: 'test-2',
                items: [
                    {
                        name: 'item1',
                        tags: ['tag1'],
                        children: ['invalid-child'],
                    },
                ],
            });
        }).toThrow();
    });
});
//# sourceMappingURL=ObjectArrayType.nested-within-nested.test.js.map