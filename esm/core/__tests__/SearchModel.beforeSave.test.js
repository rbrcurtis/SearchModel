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
import { SearchModel } from '../SearchModel';
import { StringType, NumberType, DateType } from '../../decorators';
import { search } from '../SearchService';
import { id } from '../../utils/id';
jest.mock('../SearchService', () => {
    const actual = jest.requireActual('../SearchService');
    return {
        ...actual,
        search: {
            searchRequest: jest.fn(),
            query: jest.fn(),
            getById: jest.fn()
        }
    };
});
const mockedSearch = search;
class BlogPost extends SearchModel {
    async beforeSave(event) {
        if (!this.slug && this.title) {
            this.slug = this.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        if (this.content) {
            const wordsPerMinute = 200;
            const wordCount = this.content.split(/\s+/).length;
            this.readTimeMinutes = Math.ceil(wordCount / wordsPerMinute);
        }
        if (this.title && this.title.includes('PUBLISH')) {
            this.status = 'published';
            this.publishedAt = new Date();
        }
        if (!this.status) {
            this.status = 'draft';
        }
    }
}
BlogPost.indexName = 'blog-posts';
__decorate([
    StringType({ required: true }),
    __metadata("design:type", String)
], BlogPost.prototype, "title", void 0);
__decorate([
    StringType(),
    __metadata("design:type", String)
], BlogPost.prototype, "slug", void 0);
__decorate([
    StringType(),
    __metadata("design:type", String)
], BlogPost.prototype, "content", void 0);
__decorate([
    NumberType(),
    __metadata("design:type", Number)
], BlogPost.prototype, "readTimeMinutes", void 0);
__decorate([
    DateType(),
    __metadata("design:type", Date)
], BlogPost.prototype, "publishedAt", void 0);
__decorate([
    StringType(),
    __metadata("design:type", String)
], BlogPost.prototype, "status", void 0);
class Product extends SearchModel {
    async beforeSave(event) {
        if (this.price >= 1000 && !this.discountPercent) {
            this.discountPercent = 10;
        }
        if (this.discountPercent && this.discountPercent > 0) {
            this.discountedPrice = this.price * (1 - this.discountPercent / 100);
        }
        if (this.price < 50) {
            this.category = 'budget';
        }
        else if (this.price >= 1000) {
            this.category = 'premium';
        }
        else if (!this.category) {
            this.category = 'standard';
        }
    }
}
Product.indexName = 'products';
__decorate([
    StringType({ required: true }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    NumberType({ required: true }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    NumberType(),
    __metadata("design:type", Number)
], Product.prototype, "discountedPrice", void 0);
__decorate([
    StringType(),
    __metadata("design:type", String)
], Product.prototype, "category", void 0);
__decorate([
    NumberType(),
    __metadata("design:type", Number)
], Product.prototype, "discountPercent", void 0);
describe('SearchModel beforeSave Property Persistence', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedSearch.searchRequest.mockReset();
    });
    describe('properties set in beforeSave are persisted', () => {
        it('should persist auto-generated slug in Elasticsearch', async () => {
            const testId = id();
            let capturedDocument;
            mockedSearch.searchRequest.mockImplementation((method, url, document) => {
                capturedDocument = document;
                return Promise.resolve({
                    _id: testId,
                    _version: 1
                });
            });
            const post = new BlogPost({
                id: testId,
                title: 'Hello World Example',
                content: 'This is some test content for our blog post.'
            });
            await post.save();
            expect(post.slug).toBe('hello-world-example');
            expect(capturedDocument).toMatchObject({
                id: testId,
                title: 'Hello World Example',
                slug: 'hello-world-example',
                content: 'This is some test content for our blog post.',
                readTimeMinutes: 1,
                status: 'draft'
            });
            expect(mockedSearch.searchRequest).toHaveBeenCalledWith('PUT', `/blog-posts/_doc/${testId}?refresh=wait_for`, expect.objectContaining({
                slug: 'hello-world-example',
                readTimeMinutes: 1,
                status: 'draft'
            }));
        });
        it('should persist calculated reading time in Elasticsearch', async () => {
            const testId = id();
            let capturedDocument;
            mockedSearch.searchRequest.mockImplementation((method, url, document) => {
                capturedDocument = document;
                return Promise.resolve({
                    _id: testId,
                    _version: 1
                });
            });
            const longContent = Array(400).fill('word').join(' ');
            const post = new BlogPost({
                id: testId,
                title: 'Long Article',
                content: longContent
            });
            await post.save();
            expect(post.readTimeMinutes).toBe(2);
            expect(capturedDocument.readTimeMinutes).toBe(2);
        });
        it('should persist auto-publish status and timestamp', async () => {
            const testId = id();
            let capturedDocument;
            mockedSearch.searchRequest.mockImplementation((method, url, document) => {
                capturedDocument = document;
                return Promise.resolve({
                    _id: testId,
                    _version: 1
                });
            });
            const post = new BlogPost({
                id: testId,
                title: 'PUBLISH This Article Now',
                content: 'This should be auto-published.'
            });
            const beforeSaveTime = new Date();
            await post.save();
            const afterSaveTime = new Date();
            expect(post.status).toBe('published');
            expect(post.publishedAt).toBeInstanceOf(Date);
            expect(post.publishedAt.getTime()).toBeGreaterThanOrEqual(beforeSaveTime.getTime());
            expect(post.publishedAt.getTime()).toBeLessThanOrEqual(afterSaveTime.getTime());
            expect(capturedDocument.status).toBe('published');
            expect(capturedDocument.publishedAt).toBe(post.publishedAt.toISOString());
        });
        it('should persist multiple properties set in beforeSave simultaneously', async () => {
            const testId = id();
            let capturedDocument;
            mockedSearch.searchRequest.mockImplementation((method, url, document) => {
                capturedDocument = document;
                return Promise.resolve({
                    _id: testId,
                    _version: 1
                });
            });
            const product = new Product({
                id: testId,
                name: 'Luxury Watch',
                price: 1500
            });
            await product.save();
            expect(product.discountPercent).toBe(10);
            expect(product.discountedPrice).toBe(1350);
            expect(product.category).toBe('premium');
            expect(capturedDocument).toMatchObject({
                id: testId,
                name: 'Luxury Watch',
                price: 1500,
                discountPercent: 10,
                discountedPrice: 1350,
                category: 'premium'
            });
        });
        it('should persist properties modified in beforeSave even if they were already set', async () => {
            const testId = id();
            let capturedDocument;
            mockedSearch.searchRequest.mockImplementation((method, url, document) => {
                capturedDocument = document;
                return Promise.resolve({
                    _id: testId,
                    _version: 1
                });
            });
            const product = new Product({
                id: testId,
                name: 'Budget Item',
                price: 25,
                category: 'electronics'
            });
            await product.save();
            expect(product.category).toBe('budget');
            expect(capturedDocument.category).toBe('budget');
        });
    });
    describe('change tracking with beforeSave modifications', () => {
        it('should track fields modified in beforeSave hook', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const post = new BlogPost({
                id: testId,
                title: 'Test Article',
                content: 'Some content here.'
            });
            post['clearChangedFields']();
            post.title = 'Updated Title';
            await post.save();
            expect(mockedSearch.searchRequest).toHaveBeenCalledWith('PUT', `/blog-posts/_doc/${testId}?refresh=wait_for`, expect.objectContaining({
                title: 'Updated Title',
                slug: 'updated-title',
                readTimeMinutes: 1,
                status: 'draft'
            }));
        });
        it('should work correctly with the update() method and beforeSave', async () => {
            const testId = id();
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const post = new BlogPost({
                id: testId,
                title: 'Original',
                content: 'Original content.'
            });
            post['clearChangedFields']();
            const longContent = Array(500).fill('word').join(' ');
            post.update({
                title: 'PUBLISH Updated Article',
                content: longContent
            });
            await post.save();
            expect(post.title).toBe('PUBLISH Updated Article');
            expect(post.slug).toBe('publish-updated-article');
            expect(post.status).toBe('published');
            expect(post.publishedAt).toBeInstanceOf(Date);
            expect(post.readTimeMinutes).toBe(3);
            expect(mockedSearch.searchRequest).toHaveBeenCalledWith('PUT', `/blog-posts/_doc/${testId}?refresh=wait_for`, expect.objectContaining({
                title: 'PUBLISH Updated Article',
                slug: 'publish-updated-article',
                status: 'published',
                publishedAt: post.publishedAt.toISOString(),
                readTimeMinutes: post.readTimeMinutes
            }));
        });
    });
    describe('beforeSave order of operations', () => {
        it('should call beforeSave before validation and defaults', async () => {
            const testId = id();
            const callOrder = [];
            class TestModel extends SearchModel {
                async beforeSave(event) {
                    callOrder.push('beforeSave');
                    this.name = 'set-in-beforeSave';
                }
            }
            TestModel.indexName = 'test';
            __decorate([
                StringType({ required: true }),
                __metadata("design:type", String)
            ], TestModel.prototype, "name", void 0);
            __decorate([
                StringType({ default: () => 'default-value' }),
                __metadata("design:type", String)
            ], TestModel.prototype, "optionalField", void 0);
            const originalApplyDefaults = TestModel.prototype['applyDefaults'];
            TestModel.prototype['applyDefaults'] = function () {
                callOrder.push('applyDefaults');
                return originalApplyDefaults.call(this);
            };
            const originalValidateRequiredFields = TestModel.prototype['validateRequiredFields'];
            TestModel.prototype['validateRequiredFields'] = function () {
                callOrder.push('validateRequiredFields');
                return originalValidateRequiredFields.call(this);
            };
            mockedSearch.searchRequest.mockResolvedValue({
                _id: testId,
                _version: 1
            });
            const model = new TestModel({ id: testId });
            await model.save();
            expect(callOrder).toEqual(['applyDefaults', 'beforeSave', 'applyDefaults', 'validateRequiredFields']);
            expect(model.name).toBe('set-in-beforeSave');
            TestModel.prototype['applyDefaults'] = originalApplyDefaults;
            TestModel.prototype['validateRequiredFields'] = originalValidateRequiredFields;
        });
    });
});
//# sourceMappingURL=SearchModel.beforeSave.test.js.map