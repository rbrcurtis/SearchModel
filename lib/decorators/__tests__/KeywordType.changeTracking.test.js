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
const id_1 = require("../../utils/id");
class TestKeywordModel extends SearchModel_1.SearchModel {
}
TestKeywordModel.indexName = 'test-keyword-index';
__decorate([
    (0, index_1.KeywordType)({ required: true }),
    __metadata("design:type", String)
], TestKeywordModel.prototype, "category", void 0);
__decorate([
    (0, index_1.KeywordType)(),
    __metadata("design:type", String)
], TestKeywordModel.prototype, "tag", void 0);
describe('KeywordType Change Tracking', () => {
    it('should track changes when setting keyword field', () => {
        const model = new TestKeywordModel();
        expect(model['getChangedFields']()).toHaveLength(0);
        model.category = 'electronics';
        const changedFields = model['getChangedFields']();
        expect(changedFields).toContain('category');
        expect(changedFields).toHaveLength(1);
    });
    it('should track changes when updating keyword field', () => {
        const model = new TestKeywordModel({ category: 'books' });
        model['clearChangedFields']();
        expect(model['getChangedFields']()).toHaveLength(0);
        model.category = 'electronics';
        const changedFields = model['getChangedFields']();
        expect(changedFields).toContain('category');
        expect(changedFields).toHaveLength(1);
    });
    it('should track changes for multiple keyword fields', () => {
        const model = new TestKeywordModel();
        model.category = 'electronics';
        model.tag = 'featured';
        const changedFields = model['getChangedFields']();
        expect(changedFields).toContain('category');
        expect(changedFields).toContain('tag');
        expect(changedFields).toHaveLength(2);
    });
    it('should not track changes when setting same value', () => {
        const testId = (0, id_1.id)();
        const model = new TestKeywordModel({
            id: testId,
            category: 'books'
        });
        model['clearChangedFields']();
        expect(model['getChangedFields']()).toHaveLength(0);
        model.category = 'books';
        expect(model['getChangedFields']()).toHaveLength(0);
    });
    it('should track changes when setting keyword field to null/undefined', () => {
        const model = new TestKeywordModel({ category: 'books' });
        model['clearChangedFields']();
        model.category = undefined;
        const changedFields = model['getChangedFields']();
        expect(changedFields).toContain('category');
        expect(changedFields).toHaveLength(1);
    });
    it('should validate keyword field type and track changes', () => {
        const model = new TestKeywordModel();
        model.category = 'electronics';
        expect(model['getChangedFields']()).toContain('category');
        expect(() => {
            model.tag = 123;
        }).toThrow("Field 'tag' must be a string, got number");
        expect(model['getChangedFields']()).toHaveLength(1);
        expect(model['getChangedFields']()).toContain('category');
    });
});
//# sourceMappingURL=KeywordType.changeTracking.test.js.map