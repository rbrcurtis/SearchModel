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
const SearchService_1 = require("../SearchService");
const id_1 = require("../../utils/id");
vi.mock('../SearchService', async () => {
    const actual = await vi.importActual('../SearchService');
    return {
        ...actual,
        search: {
            searchRequest: vi.fn(),
            query: vi.fn(),
            getById: vi.fn(),
        },
    };
});
const mockedSearch = SearchService_1.search;
class TestModel extends SearchModel_1.SearchModel {
    async beforeSave(event) {
        this.isNewInBeforeSave = this.isNew();
        return true;
    }
    async afterSave(event) {
        this.isNewInAfterSave = this.isNew();
    }
}
TestModel.indexName = 'test-is-new';
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], TestModel.prototype, "name", void 0);
describe('SearchModel.isNew()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSearch.searchRequest.mockReset();
    });
    it('should return true for a freshly constructed instance', () => {
        const model = new TestModel({ name: 'test' });
        expect(model.isNew()).toBe(true);
    });
    it('should return false when constructed with id and version (loaded from ES)', () => {
        const model = new TestModel({ id: (0, id_1.id)(), name: 'test', version: 1 });
        expect(model.isNew()).toBe(false);
    });
    it('should return false after first save', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 });
        const model = new TestModel({ id: testId, name: 'test' });
        expect(model.isNew()).toBe(true);
        await model.save();
        expect(model.isNew()).toBe(false);
    });
    it('should remain false after subsequent saves', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 });
        const model = new TestModel({ id: testId, name: 'test' });
        await model.save();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 2 });
        model.name = 'updated';
        await model.save();
        expect(model.isNew()).toBe(false);
    });
    it('should return true in beforeSave for new documents', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 });
        const model = new TestModel({ id: testId, name: 'test' });
        await model.save();
        expect(model.isNewInBeforeSave).toBe(true);
    });
    it('should return false in beforeSave for existing documents', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 });
        const model = new TestModel({ id: testId, name: 'test' });
        await model.save();
        model.isNewInBeforeSave = undefined;
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 2 });
        model.name = 'updated';
        await model.save();
        expect(model.isNewInBeforeSave).toBe(false);
    });
    it('should return true in afterSave for new documents', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 });
        const model = new TestModel({ id: testId, name: 'test' });
        await model.save();
        expect(model.isNewInAfterSave).toBe(true);
        expect(model.isNew()).toBe(false);
    });
    it('should return false in afterSave for existing documents', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 1 });
        const model = new TestModel({ id: testId, name: 'test' });
        await model.save();
        model.isNewInAfterSave = undefined;
        mockedSearch.searchRequest.mockResolvedValue({ _id: testId, _version: 2 });
        model.name = 'updated again';
        await model.save();
        expect(model.isNewInAfterSave).toBe(false);
    });
    it('should return false for documents loaded via constructor with id+version', () => {
        const model = new TestModel({
            id: (0, id_1.id)(),
            name: 'loaded',
            version: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        expect(model.isNew()).toBe(false);
    });
    it('should return true when only id is provided (no version)', () => {
        const model = new TestModel({ id: (0, id_1.id)(), name: 'test' });
        expect(model.isNew()).toBe(true);
    });
    it('should still be true if save fails', async () => {
        const testId = (0, id_1.id)();
        mockedSearch.searchRequest.mockRejectedValue(new Error('ES unavailable'));
        const model = new TestModel({ id: testId, name: 'test' });
        expect(model.isNew()).toBe(true);
        await expect(model.save()).rejects.toThrow('ES unavailable');
        expect(model.isNew()).toBe(true);
    });
});
//# sourceMappingURL=SearchModel.isNew.test.js.map