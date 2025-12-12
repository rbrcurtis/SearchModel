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
class AfterSaveTestModel extends SearchModel_1.SearchModel {
    constructor() {
        super(...arguments);
        this.afterSaveCalled = false;
        this.afterSaveEvent = null;
        this.afterSaveTimestamp = null;
    }
    async afterSave(event) {
        console.log('afterSave', event);
        this.afterSaveCalled = true;
        this.afterSaveEvent = event;
        this.afterSaveTimestamp = new Date();
    }
}
AfterSaveTestModel.indexName = `after_save_tests_${(0, id_1.id)()}`;
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], AfterSaveTestModel.prototype, "name", void 0);
__decorate([
    (0, decorators_1.NumberType)(),
    __metadata("design:type", Number)
], AfterSaveTestModel.prototype, "count", void 0);
describe('SearchModel afterSave Integration', () => {
    let testIndexName;
    beforeAll(async () => {
        testIndexName = AfterSaveTestModel.indexName;
        await SearchModel_1.SearchModel.createIndex.call(AfterSaveTestModel);
    });
    afterAll(async () => {
        const { search } = await Promise.resolve().then(() => __importStar(require('../SearchService')));
        try {
            await search.searchRequest('DELETE', `/${testIndexName}`);
        }
        catch (err) {
        }
    });
    it('should call afterSave after saving a new document', async () => {
        const testId = (0, id_1.id)();
        const model = new AfterSaveTestModel({
            id: testId,
            name: 'Test Document',
            count: 1,
        });
        expect(model.afterSaveCalled).toBe(false);
        await model.save();
        expect(model.afterSaveCalled).toBe(true);
        expect(model.afterSaveEvent).toBeDefined();
        expect(model.afterSaveTimestamp).toBeInstanceOf(Date);
        const loaded = await AfterSaveTestModel.getById(testId);
        expect(loaded).toBeDefined();
        expect(loaded.name).toBe('Test Document');
        await loaded.delete();
    });
    it('should call afterSave after updating an existing document', async () => {
        const testId = (0, id_1.id)();
        const model = new AfterSaveTestModel({
            id: testId,
            name: 'Initial Name',
            count: 1,
        });
        await model.save();
        expect(model.afterSaveCalled).toBe(true);
        model.afterSaveCalled = false;
        model.afterSaveEvent = null;
        model.name = 'Updated Name';
        model.count = 2;
        await model.save();
        expect(model.afterSaveCalled).toBe(true);
        expect(model.afterSaveEvent).toBeDefined();
        const loaded = await AfterSaveTestModel.getById(testId);
        expect(loaded.name).toBe('Updated Name');
        expect(loaded.count).toBe(2);
        await loaded.delete();
    });
    it('should receive updated fields in afterSave event', async () => {
        const testId = (0, id_1.id)();
        const model = new AfterSaveTestModel({
            id: testId,
            name: 'Test',
            count: 0,
        });
        await model.save();
        model.afterSaveCalled = false;
        model.afterSaveEvent = null;
        model.name = 'Changed Name';
        await model.save();
        expect(model.afterSaveCalled).toBe(true);
        expect(model.afterSaveEvent).toBeDefined();
        expect(model.afterSaveEvent.updated).toContain('name');
        await model.delete();
    });
});
//# sourceMappingURL=SearchModel.afterSave.test.js.map