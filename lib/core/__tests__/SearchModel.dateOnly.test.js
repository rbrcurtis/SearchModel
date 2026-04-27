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
const id_1 = require("../../utils/id");
const SearchService_1 = require("../SearchService");
vi.mock('../SearchService', async () => {
    const actual = await vi.importActual('../SearchService');
    return {
        ...actual,
        search: {
            searchRequest: vi.fn(),
            query: vi.fn(),
            getById: vi.fn()
        }
    };
});
class DateOnlyModel extends SearchModel_1.SearchModel {
}
DateOnlyModel.indexName = 'test-dateonly-index';
__decorate([
    (0, decorators_1.DateOnlyType)({ required: true }),
    __metadata("design:type", String)
], DateOnlyModel.prototype, "birthDate", void 0);
__decorate([
    (0, decorators_1.DateOnlyType)(),
    __metadata("design:type", String)
], DateOnlyModel.prototype, "startDate", void 0);
__decorate([
    (0, decorators_1.DateOnlyType)({ default: () => '2024-01-01' }),
    __metadata("design:type", String)
], DateOnlyModel.prototype, "defaultDate", void 0);
__decorate([
    (0, decorators_1.StringType)(),
    __metadata("design:type", String)
], DateOnlyModel.prototype, "name", void 0);
describe('SearchModel DateOnlyType', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('setter coercion', () => {
        it('should pass through a YYYY-MM-DD string as-is', () => {
            const model = new DateOnlyModel();
            model.birthDate = '1990-05-15';
            expect(model.birthDate).toBe('1990-05-15');
        });
        it('should coerce a Date object to YYYY-MM-DD string', () => {
            const model = new DateOnlyModel();
            model.birthDate = new Date('2024-03-27T10:30:00.000Z');
            expect(model.birthDate).toBe('2024-03-27');
        });
        it('should coerce an ISO timestamp string to YYYY-MM-DD', () => {
            const model = new DateOnlyModel();
            model.birthDate = '2024-01-15T10:30:00.000Z';
            expect(model.birthDate).toBe('2024-01-15');
        });
        it('should coerce an ISO timestamp string without Z to YYYY-MM-DD', () => {
            const model = new DateOnlyModel();
            model.birthDate = '2024-06-20T23:59:59.999';
            expect(model.birthDate).toBe('2024-06-20');
        });
        it('should preserve YYYY-MM-DD format without modification', () => {
            const model = new DateOnlyModel();
            model.startDate = '2000-12-31';
            expect(model.startDate).toBe('2000-12-31');
        });
    });
    describe('validation', () => {
        it('should throw on an invalid non-date string', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = 'not-a-date';
            }).toThrow("must be a valid date string in YYYY-MM-DD format");
        });
        it('should throw on a date string that does not match YYYY-MM-DD format', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = '15/05/1990';
            }).toThrow("must be a valid date string in YYYY-MM-DD format");
        });
        it('should throw on a MM-DD-YYYY format string', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = '05-15-1990';
            }).toThrow("must be a valid date string in YYYY-MM-DD format");
        });
        it('should throw on a number value', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = 12345;
            }).toThrow("must be a Date or string");
        });
        it('should throw on an object value', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = {};
            }).toThrow("must be a Date or string");
        });
        it('should throw on a boolean value', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = true;
            }).toThrow("must be a Date or string");
        });
        it('should accept null without throwing', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = null;
            }).not.toThrow();
            expect(model.birthDate).toBeNull();
        });
        it('should accept undefined without throwing', () => {
            const model = new DateOnlyModel();
            expect(() => {
                model.birthDate = undefined;
            }).not.toThrow();
            expect(model.birthDate).toBeUndefined();
        });
        it('should throw on save when required field is missing', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: (0, id_1.id)(),
                _version: 1
            });
            const model = new DateOnlyModel();
            model.name = 'Test';
            await expect(model.save()).rejects.toThrow();
        });
    });
    describe('fromJSON coercion', () => {
        it('should pass through a YYYY-MM-DD string unchanged', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 1,
                birthDate: '1990-05-15'
            });
            expect(model.birthDate).toBe('1990-05-15');
        });
        it('should coerce a Date object to YYYY-MM-DD when loading', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 1,
                birthDate: new Date('2024-03-27T14:00:00.000Z')
            });
            expect(model.birthDate).toBe('2024-03-27');
        });
        it('should coerce an ISO timestamp string to YYYY-MM-DD when loading', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 1,
                birthDate: '2024-01-15T10:30:00.000Z'
            });
            expect(model.birthDate).toBe('2024-01-15');
        });
        it('should pass through null unchanged', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 1,
                birthDate: null
            });
            expect(model.birthDate).toBeNull();
        });
        it('should pass through undefined unchanged (field absent)', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 1
            });
            expect(model.birthDate).toBeUndefined();
        });
        it('should load multiple dateOnly fields correctly', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 1,
                birthDate: '1990-05-15',
                startDate: '2024-01-01T00:00:00.000Z'
            });
            expect(model.birthDate).toBe('1990-05-15');
            expect(model.startDate).toBe('2024-01-01');
        });
    });
    describe('mapping generation', () => {
        it('should generate strict_date format mapping for dateOnly fields', () => {
            const mapping = DateOnlyModel.generateMapping();
            expect(mapping.mappings.properties.birthDate).toEqual({
                type: 'date',
                format: 'strict_date'
            });
        });
        it('should generate strict_date format for all dateOnly fields', () => {
            const mapping = DateOnlyModel.generateMapping();
            expect(mapping.mappings.properties.startDate).toEqual({
                type: 'date',
                format: 'strict_date'
            });
            expect(mapping.mappings.properties.defaultDate).toEqual({
                type: 'date',
                format: 'strict_date'
            });
        });
        it('should generate text mapping for non-dateOnly string fields', () => {
            const mapping = DateOnlyModel.generateMapping();
            expect(mapping.mappings.properties.name.type).toBe('text');
        });
        it('should include mappings wrapper in generated output', () => {
            const mapping = DateOnlyModel.generateMapping();
            expect(mapping).toHaveProperty('mappings');
            expect(mapping.mappings).toHaveProperty('properties');
        });
    });
    describe('save/toSearch output', () => {
        it('should output YYYY-MM-DD string in toSearch when string was set', () => {
            const model = new DateOnlyModel();
            model.birthDate = '1990-05-15';
            const doc = model.toSearch();
            expect(doc.birthDate).toBe('1990-05-15');
        });
        it('should output YYYY-MM-DD string in toJSON when string was set', () => {
            const model = new DateOnlyModel();
            model.birthDate = '2024-06-15';
            const doc = model.toJSON();
            expect(doc.birthDate).toBe('2024-06-15');
        });
        it('should coerce Date object to YYYY-MM-DD string in toSearch', () => {
            const model = new DateOnlyModel();
            model.birthDate = new Date('2024-03-27T00:00:00.000Z');
            const doc = model.toSearch();
            expect(doc.birthDate).toBe('2024-03-27');
        });
        it('should store YYYY-MM-DD string in Elasticsearch on save', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: (0, id_1.id)(),
                _version: 1
            });
            const model = new DateOnlyModel();
            model.birthDate = '1990-05-15';
            await model.save();
            const savedData = vi.mocked(SearchService_1.search.searchRequest).mock.calls[0][2];
            expect(savedData.birthDate).toBe('1990-05-15');
        });
        it('should store coerced YYYY-MM-DD when Date object was set, on save', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: (0, id_1.id)(),
                _version: 1
            });
            const model = new DateOnlyModel();
            model.birthDate = new Date('2024-07-04T12:00:00.000Z');
            await model.save();
            const savedData = vi.mocked(SearchService_1.search.searchRequest).mock.calls[0][2];
            expect(savedData.birthDate).toBe('2024-07-04');
        });
        it('should store coerced YYYY-MM-DD when ISO timestamp string was set, on save', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: (0, id_1.id)(),
                _version: 1
            });
            const model = new DateOnlyModel();
            model.birthDate = '2024-01-15T10:30:00.000Z';
            await model.save();
            const savedData = vi.mocked(SearchService_1.search.searchRequest).mock.calls[0][2];
            expect(savedData.birthDate).toBe('2024-01-15');
        });
    });
    describe('defaults and required', () => {
        it('should not apply default in constructor', () => {
            const model = new DateOnlyModel();
            expect(model.defaultDate).toBeUndefined();
        });
        it('should apply default during save for new documents', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: (0, id_1.id)(),
                _version: 1
            });
            const model = new DateOnlyModel();
            model.birthDate = '1990-05-15';
            await model.save();
            expect(model.defaultDate).toBe('2024-01-01');
            const savedData = vi.mocked(SearchService_1.search.searchRequest).mock.calls[0][2];
            expect(savedData.defaultDate).toBe('2024-01-01');
        });
        it('should not override an explicitly set value with default', async () => {
            vi.mocked(SearchService_1.search.searchRequest).mockResolvedValue({
                _id: (0, id_1.id)(),
                _version: 1
            });
            const model = new DateOnlyModel();
            model.birthDate = '1990-05-15';
            model.defaultDate = '2000-12-25';
            await model.save();
            expect(model.defaultDate).toBe('2000-12-25');
            const savedData = vi.mocked(SearchService_1.search.searchRequest).mock.calls[0][2];
            expect(savedData.defaultDate).toBe('2000-12-25');
        });
        it('should not apply default when loading existing document via fromJSON', () => {
            const model = DateOnlyModel.fromJSON({
                id: (0, id_1.id)(),
                version: 2,
                birthDate: '1990-05-15'
            });
            expect(model.defaultDate).toBeUndefined();
        });
    });
});
//# sourceMappingURL=SearchModel.dateOnly.test.js.map