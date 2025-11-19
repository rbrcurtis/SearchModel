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
const id_1 = require("../../utils/id");
class StringArrayTestModel extends SearchModel_1.SearchModel {
}
StringArrayTestModel.indexName = `search_model_tests_${(0, id_1.id)()}`;
__decorate([
    (0, decorators_1.StringArrayType)({ required: true }),
    __metadata("design:type", Array)
], StringArrayTestModel.prototype, "tags", void 0);
__decorate([
    (0, decorators_1.StringArrayType)(),
    __metadata("design:type", Array)
], StringArrayTestModel.prototype, "categories", void 0);
describe('StringArrayType Elasticsearch Integration', () => {
    let testIndexName;
    beforeAll(async () => {
        testIndexName = StringArrayTestModel.indexName;
        await SearchModel_1.SearchModel.createIndex.call(StringArrayTestModel);
    });
    afterAll(async () => {
        const { search } = await Promise.resolve().then(() => __importStar(require('../SearchService')));
        try {
            await search.searchRequest('DELETE', `/${testIndexName}`);
        }
        catch (err) {
        }
    });
    it('should save, load, save again, load again, modify, save, and load with string array field persisting correctly', async () => {
        const testId = (0, id_1.id)();
        const model = new StringArrayTestModel({
            id: testId,
            tags: ['tag1', 'tag2', 'tag3'],
            categories: ['cat1', 'cat2']
        });
        await model.save();
        expect(model.id).toBe(testId);
        const loaded1 = await StringArrayTestModel.getById(testId);
        expect(loaded1).toBeDefined();
        expect(loaded1.id).toBe(testId);
        expect(Array.isArray(loaded1.tags)).toBe(true);
        expect([...loaded1.tags]).toEqual(['tag1', 'tag2', 'tag3']);
        expect(Array.isArray(loaded1.categories)).toBe(true);
        expect([...loaded1.categories]).toEqual(['cat1', 'cat2']);
        await loaded1.save();
        const loaded2 = await StringArrayTestModel.getById(testId);
        expect(loaded2).toBeDefined();
        expect(loaded2.id).toBe(testId);
        expect(Array.isArray(loaded2.tags)).toBe(true);
        expect([...loaded2.tags]).toEqual(['tag1', 'tag2', 'tag3']);
        expect(Array.isArray(loaded2.categories)).toBe(true);
        expect([...loaded2.categories]).toEqual(['cat1', 'cat2']);
        loaded2.tags = ['modified1', 'modified2'];
        loaded2.categories = ['newcat1', 'newcat2', 'newcat3'];
        await loaded2.save();
        const loaded3 = await StringArrayTestModel.getById(testId);
        expect(loaded3).toBeDefined();
        expect(loaded3.id).toBe(testId);
        expect(Array.isArray(loaded3.tags)).toBe(true);
        expect([...loaded3.tags]).toEqual(['modified1', 'modified2']);
        expect(Array.isArray(loaded3.categories)).toBe(true);
        expect([...loaded3.categories]).toEqual(['newcat1', 'newcat2', 'newcat3']);
        await loaded3.delete();
    });
    it('should handle empty string arrays correctly through save/load cycles', async () => {
        const testId = (0, id_1.id)();
        const model = new StringArrayTestModel({
            id: testId,
            tags: [],
            categories: []
        });
        await model.save();
        const loaded = await StringArrayTestModel.getById(testId);
        expect(loaded).toBeDefined();
        expect(Array.isArray(loaded.tags)).toBe(true);
        expect([...loaded.tags]).toEqual([]);
        expect(Array.isArray(loaded.categories)).toBe(true);
        expect([...loaded.categories]).toEqual([]);
        await loaded.delete();
    });
    it('should handle single-element string arrays correctly', async () => {
        const testId = (0, id_1.id)();
        const model = new StringArrayTestModel({
            id: testId,
            tags: ['single-tag']
        });
        await model.save();
        const loaded = await StringArrayTestModel.getById(testId);
        expect(loaded).toBeDefined();
        expect(Array.isArray(loaded.tags)).toBe(true);
        expect([...loaded.tags]).toEqual(['single-tag']);
        await loaded.delete();
    });
});
//# sourceMappingURL=StringArrayType.elasticsearch.test.js.map