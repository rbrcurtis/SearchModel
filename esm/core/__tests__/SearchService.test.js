import { search, SearchError, VersionConflictError } from '../SearchService';
import { id } from '../../utils/id';
global.fetch = jest.fn();
describe('SearchService', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv, ELASTICSEARCH_URL: 'http://localhost:9200' };
        jest.clearAllMocks();
        search._resetConfig();
    });
    afterEach(() => {
        process.env = originalEnv;
        search._resetConfig();
    });
    describe('initialization', () => {
        it('should use ELASTICSEARCH_URL from environment', async () => {
            process.env.ELASTICSEARCH_URL = 'http://custom:9200';
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true })
            });
            await search.searchRequest('GET', '/test');
            expect(global.fetch).toHaveBeenCalledWith('http://custom:9200/test', expect.any(Object));
        });
    });
    describe('searchRequest', () => {
        it('should make successful request', async () => {
            const mockResponse = { _id: 'test', _version: 1 };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => mockResponse
            });
            const result = await search.searchRequest('GET', '/test-index/_doc/123');
            expect(global.fetch).toHaveBeenCalledWith('http://localhost:9200/test-index/_doc/123', expect.objectContaining({
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }));
            expect(result).toEqual(mockResponse);
        });
        it('should include body for POST requests', async () => {
            const requestBody = { query: { match_all: {} } };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ hits: [] })
            });
            await search.searchRequest('POST', '/test-index/_search', requestBody);
            expect(global.fetch).toHaveBeenCalledWith('http://localhost:9200/test-index/_search', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(requestBody)
            }));
        });
        it('should add version parameters when provided', async () => {
            ;
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({})
            });
            await search.searchRequest('PUT', '/test-index/_doc/123', {}, { version: 2 });
            expect(global.fetch).toHaveBeenCalledWith('http://localhost:9200/test-index/_doc/123?version=2&version_type=external', expect.any(Object));
        });
        it('should handle 404 errors', async () => {
            ;
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => 'Document not found'
            });
            await expect(search.searchRequest('GET', '/test-index/_doc/123')).rejects.toThrow(SearchError);
        });
        it('should handle version conflict errors', async () => {
            const errorBody = JSON.stringify({
                error: {
                    type: 'version_conflict_engine_exception',
                    reason: 'current version [2] is different than the one provided [1]'
                }
            });
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                statusText: 'Conflict',
                text: async () => errorBody
            });
            await expect(search.searchRequest('PUT', '/test-index/_doc/123', {})).rejects.toThrow(VersionConflictError);
        });
        it('should retry on rate limit (429)', async () => {
            ;
            global.fetch
                .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            })
                .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true })
            });
            const result = await search.searchRequest('GET', '/test-index/_doc/123');
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });
        it('should retry on network errors', async () => {
            ;
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true })
            });
            const result = await search.searchRequest('GET', '/test-index/_doc/123');
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });
        it('should throw after max retries', async () => {
            ;
            global.fetch.mockRejectedValue(new Error('Network error'));
            await expect(search.searchRequest('GET', '/test-index/_doc/123')).rejects.toThrow('Search request failed after 3 retries');
        }, 10000);
    });
    describe('query', () => {
        it('should query with string index name', async () => {
            const mockResponse = {
                hits: {
                    total: { value: 2 },
                    hits: [
                        { _id: '1', _source: { name: 'Test 1' } },
                        { _id: '2', _source: { name: 'Test 2' } }
                    ]
                }
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });
            const result = await search.query('test-index', ['search term']);
            expect(result.total).toBe(2);
            expect(result.hits).toHaveLength(2);
            expect(result.hits[0]).toEqual({ name: 'Test 1' });
        });
        it('should query with ModelClass', async () => {
            class TestModel {
                static fromJSON(data) {
                    const instance = Object.create(TestModel.prototype);
                    instance.data = data;
                    return instance;
                }
            }
            TestModel.indexName = 'test-index';
            const mockResponse = {
                hits: {
                    total: { value: 1 },
                    hits: [{ _id: '1', _source: { name: 'Test' } }]
                }
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockResponse
            });
            const result = await search.query(TestModel, ['search']);
            expect(result.total).toBe(1);
            expect(result.hits).toHaveLength(1);
            expect(result.hits[0]).toBeInstanceOf(TestModel);
        });
        it('should handle query options', async () => {
            ;
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ hits: { total: 0, hits: [] } })
            });
            await search.query('test-index', ['search'], {
                limit: 50,
                sort: 'createdAt:desc',
                page: 2
            });
            expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                body: expect.stringContaining('"size":50'),
            }));
            const callArgs = global.fetch.mock.calls[0][1];
            const body = JSON.parse(callArgs.body);
            expect(body.sort).toEqual([{ createdAt: { order: 'desc' } }]);
            expect(body.from).toBe(50);
        });
        it('should return empty results for 404 index not found', async () => {
            ;
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => 'Index not found'
            });
            const result = await search.query('non-existent-index', []);
            expect(result.total).toBe(0);
            expect(result.hits).toEqual([]);
        });
    });
    describe('getById', () => {
        it('should get document by ID', async () => {
            class TestModel {
                static fromJSON(data) {
                    const instance = Object.create(TestModel.prototype);
                    instance.data = data;
                    return instance;
                }
            }
            TestModel.indexName = 'test-index';
            const testId = id();
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    found: true,
                    _id: testId,
                    _source: { name: 'Test Document' }
                })
            });
            const result = await search.getById(TestModel, testId);
            expect(result).toBeInstanceOf(TestModel);
            expect(result.data.id).toBe(testId);
            expect(result.data.name).toBe('Test Document');
        });
        it('should return null when document not found', async () => {
            class TestModel {
                static fromJSON(data) {
                    const instance = Object.create(TestModel.prototype);
                    instance.data = data;
                    return instance;
                }
            }
            TestModel.indexName = 'test-index';
            const nonExistentId = id();
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ found: false })
            });
            const result = await search.getById(TestModel, nonExistentId);
            expect(result).toBeNull();
        });
        it('should return null for 404 errors', async () => {
            class TestModel {
                static fromJSON(data) {
                    const instance = Object.create(TestModel.prototype);
                    instance.data = data;
                    return instance;
                }
            }
            TestModel.indexName = 'test-index';
            const testId = id();
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => 'Not found'
            });
            const result = await search.getById(TestModel, testId);
            expect(result).toBeNull();
        });
        it('should throw error when indexName not defined', async () => {
            class NoIndexModel {
                static fromJSON(data) {
                    return Object.create(NoIndexModel.prototype);
                }
            }
            await expect(search.getById(NoIndexModel, id())).rejects.toThrow('IndexName not defined');
        });
    });
    describe('SearchError', () => {
        it('should create error with status code and response', () => {
            const error = new SearchError('Test error', 500, { error: 'Internal Server Error' });
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.response).toEqual({ error: 'Internal Server Error' });
            expect(error.name).toBe('SearchError');
        });
    });
    describe('VersionConflictError', () => {
        it('should create error with version information', () => {
            const error = new VersionConflictError('Version conflict', 2, 1);
            expect(error.message).toBe('Version conflict');
            expect(error.currentVersion).toBe(2);
            expect(error.attemptedVersion).toBe(1);
            expect(error.statusCode).toBe(409);
            expect(error.name).toBe('VersionConflictError');
        });
    });
});
//# sourceMappingURL=SearchService.test.js.map