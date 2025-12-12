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
const SearchModel_1 = require("../../core/SearchModel");
const index_1 = require("../index");
const SearchService_1 = require("../../core/SearchService");
const id_1 = require("../../utils/id");
class NumberTestModel extends SearchModel_1.SearchModel {
}
NumberTestModel.indexName = `number_coercion_test_${(0, id_1.id)()}`;
__decorate([
    (0, index_1.StringType)({ required: true }),
    __metadata("design:type", String)
], NumberTestModel.prototype, "name", void 0);
__decorate([
    (0, index_1.NumberType)(),
    __metadata("design:type", Number)
], NumberTestModel.prototype, "count", void 0);
__decorate([
    (0, index_1.NumberType)({ required: true }),
    __metadata("design:type", Number)
], NumberTestModel.prototype, "score", void 0);
describe('NumberType string coercion', () => {
    const testIndexName = NumberTestModel.indexName;
    beforeAll(async () => {
        await SearchModel_1.SearchModel.createIndex.call(NumberTestModel);
    });
    afterAll(async () => {
        try {
            await SearchService_1.search.searchRequest('DELETE', `/${testIndexName}`);
        }
        catch (err) {
        }
    });
    it('should coerce string numbers to numbers when setting properties', () => {
        const model = new NumberTestModel({ name: 'test', score: 1 });
        model.count = '42';
        expect(model.count).toBe(42);
        expect(typeof model.count).toBe('number');
    });
    it('should coerce string numbers in constructor', () => {
        const model = new NumberTestModel({
            name: 'test',
            score: '100',
            count: '50',
        });
        expect(model.score).toBe(100);
        expect(typeof model.score).toBe('number');
        expect(model.count).toBe(50);
        expect(typeof model.count).toBe('number');
    });
    it('should reject non-numeric strings', () => {
        const model = new NumberTestModel({ name: 'test', score: 1 });
        expect(() => {
            ;
            model.count = 'not-a-number';
        }).toThrow();
    });
    it('should handle decimal string numbers', () => {
        const model = new NumberTestModel({ name: 'test', score: 1 });
        model.count = '3.14';
        expect(model.count).toBe(3.14);
        expect(typeof model.count).toBe('number');
    });
    it('should handle negative string numbers', () => {
        const model = new NumberTestModel({ name: 'test', score: 1 });
        model.count = '-25';
        expect(model.count).toBe(-25);
        expect(typeof model.count).toBe('number');
    });
    it('should read string numbers from Elasticsearch and coerce to number', async () => {
        const testId = (0, id_1.id)();
        await SearchService_1.search.searchRequest('PUT', `/${testIndexName}/_doc/${testId}?refresh=wait_for`, {
            id: testId,
            name: 'direct-write-test',
            score: '999',
            count: '123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
        });
        const loaded = await NumberTestModel.getById(testId);
        expect(loaded).toBeDefined();
        expect(loaded.name).toBe('direct-write-test');
        expect(loaded.score).toBe(999);
        expect(typeof loaded.score).toBe('number');
        expect(loaded.count).toBe(123);
        expect(typeof loaded.count).toBe('number');
        await loaded.delete();
    });
    it('should handle mixed number and string number fields from Elasticsearch', async () => {
        const testId = (0, id_1.id)();
        await SearchService_1.search.searchRequest('PUT', `/${testIndexName}/_doc/${testId}?refresh=wait_for`, {
            id: testId,
            name: 'mixed-test',
            score: 50,
            count: '75',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
        });
        const loaded = await NumberTestModel.getById(testId);
        expect(loaded).toBeDefined();
        expect(loaded.score).toBe(50);
        expect(typeof loaded.score).toBe('number');
        expect(loaded.count).toBe(75);
        expect(typeof loaded.count).toBe('number');
        await loaded.delete();
    });
    it('should save coerced numbers correctly and reload them', async () => {
        const testId = (0, id_1.id)();
        await SearchService_1.search.searchRequest('PUT', `/${testIndexName}/_doc/${testId}?refresh=wait_for`, {
            id: testId,
            name: 'roundtrip-test',
            score: '200',
            count: '300',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
        });
        const loaded = await NumberTestModel.getById(testId);
        expect(loaded).toBeDefined();
        expect(loaded.score).toBe(200);
        loaded.count = 400;
        await loaded.save();
        const reloaded = await NumberTestModel.getById(testId);
        expect(reloaded.score).toBe(200);
        expect(typeof reloaded.score).toBe('number');
        expect(reloaded.count).toBe(400);
        expect(typeof reloaded.count).toBe('number');
        await reloaded.delete();
    });
});
//# sourceMappingURL=NumberType.coercion.test.js.map