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
class DomainTestModel extends SearchModel_1.SearchModel {
}
DomainTestModel.indexName = `search_model_tests_${(0, id_1.id)()}`;
__decorate([
    (0, decorators_1.StringArrayType)({
        validate: (domains) => {
            if (!domains || domains.length === 0)
                return true;
            return domains.every((domain) => {
                return (domain.includes('.') &&
                    !domain.includes(' ') &&
                    domain.length > 3 &&
                    !domain.startsWith('.') &&
                    !domain.endsWith('.') &&
                    /^[a-z0-9.-]+$/.test(domain));
            });
        },
    }),
    __metadata("design:type", Array)
], DomainTestModel.prototype, "domains", void 0);
describe('StringArrayType with Transform and Validate', () => {
    let testIndexName;
    beforeAll(async () => {
        testIndexName = DomainTestModel.indexName;
        await SearchModel_1.SearchModel.createIndex.call(DomainTestModel);
    });
    afterAll(async () => {
        const { search } = await Promise.resolve().then(() => __importStar(require('../SearchService')));
        try {
            await search.searchRequest('DELETE', `/${testIndexName}`);
        }
        catch (err) {
        }
    });
    describe('Basic functionality', () => {
        it('should accept valid normalized domains', () => {
            const model = new DomainTestModel({
                id: (0, id_1.id)(),
                domains: ['example.com', 'test.org', 'mixedcase.net']
            });
            expect([...model.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net']);
        });
        it('should handle empty array', () => {
            const model = new DomainTestModel({
                id: (0, id_1.id)(),
                domains: []
            });
            expect([...model.domains]).toEqual([]);
        });
        it('should handle undefined domains', () => {
            const model = new DomainTestModel({
                id: (0, id_1.id)()
            });
            expect(model.domains).toBeUndefined();
        });
    });
    describe('Validation rules', () => {
        it('should accept valid domains', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['example.com', 'test.org', 'sub.domain.net']
                });
            }).not.toThrow();
        });
        it('should accept empty array', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: []
                });
            }).not.toThrow();
        });
        it('should reject domain without dot', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['example', 'test.com']
                });
            }).toThrow();
        });
        it('should reject domain with spaces', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['example .com', 'test.org']
                });
            }).toThrow();
        });
        it('should reject domain shorter than 4 characters', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['a.b', 'test.com']
                });
            }).toThrow();
        });
        it('should reject domain starting with dot', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['.example.com', 'test.org']
                });
            }).toThrow();
        });
        it('should reject domain ending with dot', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['example.com.', 'test.org']
                });
            }).toThrow();
        });
        it('should reject domain with invalid characters', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['example@com', 'test.org']
                });
            }).toThrow();
        });
        it('should accept domains with numbers and hyphens', () => {
            expect(() => {
                new DomainTestModel({
                    id: (0, id_1.id)(),
                    domains: ['example123.com', 'test-site.org', 'sub-123.example.net']
                });
            }).not.toThrow();
        });
    });
    describe('Elasticsearch persistence with validation', () => {
        it('should save, load, save again, load again, modify, save, and load with validation enforced', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['example.com', 'test.org', 'mixedcase.net']
            });
            expect([...model.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net']);
            await model.save();
            const loaded1 = await DomainTestModel.getById(testId);
            expect(loaded1).toBeDefined();
            expect([...loaded1.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net']);
            await loaded1.save();
            const loaded2 = await DomainTestModel.getById(testId);
            expect(loaded2).toBeDefined();
            expect([...loaded2.domains]).toEqual(['example.com', 'test.org', 'mixedcase.net']);
            loaded2.domains = ['new-domain.com', 'another.org'];
            expect([...loaded2.domains]).toEqual(['new-domain.com', 'another.org']);
            await loaded2.save();
            const loaded3 = await DomainTestModel.getById(testId);
            expect(loaded3).toBeDefined();
            expect([...loaded3.domains]).toEqual(['new-domain.com', 'another.org']);
            await loaded3.delete();
        });
        it('should handle empty array through save/load cycles', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: []
            });
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect(loaded).toBeDefined();
            expect([...loaded.domains]).toEqual([]);
            await loaded.delete();
        });
        it('should persist single domain', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['single-domain.com']
            });
            expect([...model.domains]).toEqual(['single-domain.com']);
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect(loaded).toBeDefined();
            expect([...loaded.domains]).toEqual(['single-domain.com']);
            await loaded.delete();
        });
        it('should maintain validation rules after load', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['valid-domain.com']
            });
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect(loaded).toBeDefined();
            expect(() => {
                loaded.domains = ['invalid domain with spaces'];
            }).toThrow();
            await loaded.delete();
        });
        it('should allow valid modifications after load', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['initial.com']
            });
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect(loaded).toBeDefined();
            loaded.domains = ['modified.com', 'spaces.net'];
            expect([...loaded.domains]).toEqual(['modified.com', 'spaces.net']);
            await loaded.save();
            const loaded2 = await DomainTestModel.getById(testId);
            expect([...loaded2.domains]).toEqual(['modified.com', 'spaces.net']);
            await loaded2.delete();
        });
    });
    describe('Edge cases', () => {
        it('should handle subdomains correctly', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['sub.domain.example.com', 'deep.sub.domain.org']
            });
            expect([...model.domains]).toEqual(['sub.domain.example.com', 'deep.sub.domain.org']);
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect([...loaded.domains]).toEqual(['sub.domain.example.com', 'deep.sub.domain.org']);
            await loaded.delete();
        });
        it('should handle domains with multiple hyphens', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['multi-hyphen-domain.com', 'another-test-site.org']
            });
            expect([...model.domains]).toEqual(['multi-hyphen-domain.com', 'another-test-site.org']);
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect([...loaded.domains]).toEqual(['multi-hyphen-domain.com', 'another-test-site.org']);
            await loaded.delete();
        });
        it('should handle numeric domains', async () => {
            const testId = (0, id_1.id)();
            const model = new DomainTestModel({
                id: testId,
                domains: ['123.com', '456-test.org']
            });
            expect([...model.domains]).toEqual(['123.com', '456-test.org']);
            await model.save();
            const loaded = await DomainTestModel.getById(testId);
            expect([...loaded.domains]).toEqual(['123.com', '456-test.org']);
            await loaded.delete();
        });
    });
});
//# sourceMappingURL=StringArrayType.transform-validate.test.js.map