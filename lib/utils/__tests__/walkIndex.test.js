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
const SearchModel_1 = require("../../core/SearchModel");
const decorators_1 = require("../../decorators");
const id_1 = require("../id");
const walkIndex_1 = require("../walkIndex");
const testIndexName = `walk_index_test_${(0, id_1.id)()}`;
class WalkIndexTestModel extends SearchModel_1.SearchModel {
}
WalkIndexTestModel.indexName = testIndexName;
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], WalkIndexTestModel.prototype, "name", void 0);
__decorate([
    (0, decorators_1.NumberType)({ required: true }),
    __metadata("design:type", Number)
], WalkIndexTestModel.prototype, "value", void 0);
describe('walkIndex', () => {
    beforeAll(async () => {
        await WalkIndexTestModel.createIndex();
    });
    afterAll(async () => {
        try {
            const { search } = await Promise.resolve().then(() => __importStar(require('../../core/SearchService')));
            await search.searchRequest('DELETE', `/${testIndexName}`);
        }
        catch (err) {
        }
    });
    it('should walk through all 100 documents', async () => {
        const ids = [];
        for (let i = 0; i < 100; i++) {
            const doc = await WalkIndexTestModel.create({
                name: `test1-doc-${i}`,
                value: i,
            });
            ids.push(doc.id);
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const touched = new Set();
        await (0, walkIndex_1.walkIndex)(WalkIndexTestModel, ['*'], async (instance) => {
            if (instance.name.startsWith('test1-doc-')) {
                touched.add(instance.id);
            }
        });
        expect(touched.size).toBe(100);
        for (const docId of ids) {
            expect(touched.has(docId)).toBe(true);
        }
    }, 120000);
    it('should process documents with custom concurrency', async () => {
        const ids = [];
        for (let i = 0; i < 50; i++) {
            const doc = await WalkIndexTestModel.create({
                name: `test2-concurrency-${i}`,
                value: i + 1000,
            });
            ids.push(doc.id);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        let currentlyRunning = 0;
        let maxConcurrent = 0;
        const touched = new Set();
        await (0, walkIndex_1.walkIndex)(WalkIndexTestModel, ['*'], async (instance) => {
            if (instance.name.startsWith('test2-concurrency-')) {
                currentlyRunning++;
                maxConcurrent = Math.max(maxConcurrent, currentlyRunning);
                touched.add(instance.id);
                await new Promise((resolve) => setTimeout(resolve, 10));
                currentlyRunning--;
            }
        }, { concurrency: 5 });
        expect(touched.size).toBe(50);
        expect(maxConcurrent).toBeLessThanOrEqual(5);
        expect(maxConcurrent).toBeGreaterThan(1);
    }, 60000);
    it('should handle empty results on fresh index', async () => {
        const freshIndexName = `walk_index_fresh_${(0, id_1.id)()}`;
        class FreshTestModel extends SearchModel_1.SearchModel {
        }
        FreshTestModel.indexName = freshIndexName;
        __decorate([
            (0, decorators_1.StringType)({ required: true }),
            __metadata("design:type", String)
        ], FreshTestModel.prototype, "name", void 0);
        await FreshTestModel.createIndex();
        const touched = [];
        await (0, walkIndex_1.walkIndex)(FreshTestModel, ['*'], async (instance) => {
            touched.push(instance.id);
        });
        expect(touched.length).toBe(0);
    });
    it('should allow modifications during walk', async () => {
        const docs = [];
        for (let i = 0; i < 10; i++) {
            const doc = await WalkIndexTestModel.create({
                name: `test4-modify-${i}`,
                value: 200 + i,
            });
            docs.push(doc);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await (0, walkIndex_1.walkIndex)(WalkIndexTestModel, ['*'], async (instance) => {
            if (instance.name.startsWith('test4-modify-')) {
                instance.value = instance.value * 2;
                await instance.save();
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        for (const doc of docs) {
            const updated = await WalkIndexTestModel.getById(doc.id);
            expect(updated?.value).toBe(doc.value * 2);
        }
    }, 60000);
});
//# sourceMappingURL=walkIndex.test.js.map