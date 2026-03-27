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
class User extends SearchModel_1.SearchModel {
}
User.indexName = 'users';
__decorate([
    (0, decorators_1.StringType)({ required: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
class Order extends SearchModel_1.SearchModel {
}
Order.indexName = 'orders';
__decorate([
    (0, decorators_1.NumberType)(),
    __metadata("design:type", Number)
], Order.prototype, "total", void 0);
describe('SearchModel _model field', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSearch.searchRequest.mockReset();
        mockedSearch.query.mockReset();
        mockedSearch.getById.mockReset();
    });
    describe('toSearch', () => {
        it('should include _model with the class name', () => {
            const user = new User({ name: 'Alice' });
            const doc = user.toSearch();
            expect(doc._model).toBe('User');
        });
        it('should use the correct class name for different models', () => {
            const order = new Order({ total: 99 });
            const doc = order.toSearch();
            expect(doc._model).toBe('Order');
        });
    });
    describe('toJSON', () => {
        it('should include _model with the class name', () => {
            const user = new User({ name: 'Alice' });
            const json = user.toJSON();
            expect(json._model).toBe('User');
        });
    });
    describe('save', () => {
        it('should send _model in the document body to Elasticsearch', async () => {
            const testId = (0, id_1.id)();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1,
            });
            const user = new User({ id: testId, name: 'Alice' });
            await user.save();
            const sentDoc = mockedSearch.searchRequest.mock.calls[0][2];
            expect(sentDoc._model).toBe('User');
        });
        it('should send correct _model for each model class', async () => {
            const testId = (0, id_1.id)();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1,
            });
            const order = new Order({ id: testId, total: 50 });
            await order.save();
            const sentDoc = mockedSearch.searchRequest.mock.calls[0][2];
            expect(sentDoc._model).toBe('Order');
        });
    });
    describe('generateMapping', () => {
        it('should include _model as a keyword field', () => {
            const mapping = SearchModel_1.SearchModel.generateMapping.call(User);
            expect(mapping.mappings.properties._model).toEqual({ type: 'keyword' });
        });
    });
    describe('constructor', () => {
        it('should ignore _model in incoming data', () => {
            const user = new User({
                name: 'Alice',
                _model: 'SomeOtherThing',
            });
            expect(user.name).toBe('Alice');
            expect(user._model).toBeUndefined();
        });
        it('should still produce correct _model in toSearch after loading from ES data', () => {
            const testId = (0, id_1.id)();
            const user = new User({
                id: testId,
                name: 'Alice',
                version: 1,
                _model: 'User',
            });
            const doc = user.toSearch();
            expect(doc._model).toBe('User');
        });
    });
});
//# sourceMappingURL=SearchModel._model.test.js.map