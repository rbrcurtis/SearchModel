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
import { SearchModel, StringType, StringArrayType, ObjectArrayType, } from '../../index';
class TestModel extends SearchModel {
}
TestModel.indexName = 'test-array-mutations';
__decorate([
    StringType({ required: true }),
    __metadata("design:type", String)
], TestModel.prototype, "name", void 0);
__decorate([
    StringArrayType(),
    __metadata("design:type", Array)
], TestModel.prototype, "tags", void 0);
__decorate([
    ObjectArrayType({
        properties: {
            title: { type: 'string', options: { required: true } },
            count: { type: 'number' },
        },
    }),
    __metadata("design:type", Array)
], TestModel.prototype, "items", void 0);
describe('SearchModel - Array Mutation Tracking', () => {
    describe('StringArrayType mutation tracking', () => {
        it('should detect push mutations', () => {
            const doc = new TestModel({ name: 'Test' });
            doc.tags = ['a', 'b'];
            doc['clearChangedFields']();
            doc.tags.push('c');
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'b', 'c']);
        });
        it('should detect pop mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c'] });
            doc['clearChangedFields']();
            const removed = doc.tags.pop();
            expect(removed).toBe('c');
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'b']);
        });
        it('should detect unshift mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['b', 'c'] });
            doc['clearChangedFields']();
            doc.tags.unshift('a');
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'b', 'c']);
        });
        it('should detect shift mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c'] });
            doc['clearChangedFields']();
            const removed = doc.tags.shift();
            expect(removed).toBe('a');
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['b', 'c']);
        });
        it('should detect splice mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c', 'd'] });
            doc['clearChangedFields']();
            const removed = doc.tags.splice(1, 2, 'x', 'y');
            expect(removed).toEqual(['b', 'c']);
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'x', 'y', 'd']);
        });
        it('should detect index assignment', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c'] });
            doc['clearChangedFields']();
            doc.tags[1] = 'x';
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'x', 'c']);
        });
        it('should detect sort mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['c', 'a', 'b'] });
            doc['clearChangedFields']();
            doc.tags.sort();
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'b', 'c']);
        });
        it('should detect reverse mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c'] });
            doc['clearChangedFields']();
            doc.tags.reverse();
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['c', 'b', 'a']);
        });
        it('should detect length changes', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c', 'd'] });
            doc['clearChangedFields']();
            doc.tags.length = 2;
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['a', 'b']);
        });
    });
    describe('ObjectArrayType mutation tracking', () => {
        it('should detect push mutations', () => {
            const doc = new TestModel({
                name: 'Test',
                items: [{ title: 'Item 1' }],
            });
            doc['clearChangedFields']();
            doc.items.push({ title: 'Item 2', count: 5 });
            expect(doc['getChangedFields']()).toContain('items');
            expect([...doc.items]).toEqual([
                { title: 'Item 1' },
                { title: 'Item 2', count: 5 },
            ]);
        });
        it('should detect splice mutations', () => {
            const doc = new TestModel({
                name: 'Test',
                items: [
                    { title: 'Item 1' },
                    { title: 'Item 2' },
                    { title: 'Item 3' },
                ],
            });
            doc['clearChangedFields']();
            doc.items.splice(1, 1);
            expect(doc['getChangedFields']()).toContain('items');
            expect([...doc.items]).toEqual([{ title: 'Item 1' }, { title: 'Item 3' }]);
        });
        it('should detect index assignment', () => {
            const doc = new TestModel({
                name: 'Test',
                items: [{ title: 'Item 1' }, { title: 'Item 2' }],
            });
            doc['clearChangedFields']();
            doc.items[0] = { title: 'Updated Item', count: 10 };
            expect(doc['getChangedFields']()).toContain('items');
            expect([...doc.items]).toEqual([
                { title: 'Updated Item', count: 10 },
                { title: 'Item 2' },
            ]);
        });
    });
    describe('multiple mutations', () => {
        it('should track multiple array mutations', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a'] });
            doc['clearChangedFields']();
            doc.tags.push('b');
            doc.tags.push('c');
            doc.tags[0] = 'x';
            expect(doc['getChangedFields']()).toContain('tags');
            expect([...doc.tags]).toEqual(['x', 'b', 'c']);
        });
    });
    describe('non-mutating methods', () => {
        it('should not track map/filter/slice', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b', 'c'] });
            doc['clearChangedFields']();
            const mapped = doc.tags.map(t => t.toUpperCase());
            const filtered = doc.tags.filter(t => t !== 'b');
            const sliced = doc.tags.slice(1);
            expect(mapped).toEqual(['A', 'B', 'C']);
            expect(filtered).toEqual(['a', 'c']);
            expect(sliced).toEqual(['b', 'c']);
            expect(doc['getChangedFields']()).toEqual([]);
            expect([...doc.tags]).toEqual(['a', 'b', 'c']);
        });
    });
    describe('persistence across getter calls', () => {
        it('should maintain same proxy across multiple getter calls', () => {
            const doc = new TestModel({ name: 'Test', tags: ['a', 'b'] });
            doc['clearChangedFields']();
            const tags1 = doc.tags;
            const tags2 = doc.tags;
            expect(tags1).toBe(tags2);
            tags1.push('c');
            expect([...tags2]).toEqual(['a', 'b', 'c']);
            expect(doc['getChangedFields']()).toContain('tags');
        });
    });
});
//# sourceMappingURL=SearchModel.arrayMutations.test.js.map