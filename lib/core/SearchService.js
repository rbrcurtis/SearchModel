"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = exports.VersionConflictError = exports.SearchError = void 0;
require("dotenv/config");
const logging_1 = require("../utils/logging");
class SearchError extends Error {
    constructor(message, statusCode, response) {
        super(message);
        this.statusCode = statusCode;
        this.response = response;
        this.name = 'SearchError';
    }
}
exports.SearchError = SearchError;
class VersionConflictError extends SearchError {
    constructor(message, currentVersion, attemptedVersion) {
        super(message, 409);
        this.currentVersion = currentVersion;
        this.attemptedVersion = attemptedVersion;
        this.name = 'VersionConflictError';
    }
}
exports.VersionConflictError = VersionConflictError;
class SearchService {
    getConfig() {
        if (!this.config) {
            if (!process.env.ELASTICSEARCH_URL) {
                throw new Error('ELASTICSEARCH_URL environment variable is required');
            }
            this.config = {
                baseUrl: process.env.ELASTICSEARCH_URL,
                maxRetries: 3,
                baseDelayMs: 1000,
                maxDelayMs: 30000,
            };
        }
        return this.config;
    }
    _resetConfig() {
        this.config = undefined;
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    calculateDelay({ attempt, baseDelayMs, maxDelayMs, }) {
        const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * exponentialDelay;
        return Math.min(exponentialDelay + jitter, maxDelayMs);
    }
    async executeRequest(method, path, data, attempt = 1) {
        const config = this.getConfig();
        const url = `${config.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
        const options = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (data && !['GET', 'HEAD'].includes(method.toUpperCase())) {
            options.body = JSON.stringify(data);
        }
        (0, logging_1.debug)('elasticsearch', `[search.executeRequest] Making HTTP request`, {
            url,
            method,
            hasBody: !!options.body,
            headers: options.headers,
        });
        try {
            const response = await fetch(url, options);
            (0, logging_1.debug)('elasticsearch', `[search.executeRequest] Got HTTP response`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
            });
            if (response.status === 429 && attempt <= config.maxRetries) {
                const delayMs = this.calculateDelay({
                    attempt,
                    maxRetries: config.maxRetries,
                    baseDelayMs: config.baseDelayMs,
                    maxDelayMs: config.maxDelayMs,
                });
                (0, logging_1.logWarn)(`Rate limited (429). Retrying in ${delayMs}ms... (attempt ${attempt}/${config.maxRetries})`);
                await this.delay(delayMs);
                return this.executeRequest(method, path, data, attempt + 1);
            }
            if (!response.ok) {
                const errorBody = await response.text();
                if (response.status === 409 &&
                    errorBody.includes('version_conflict_engine_exception')) {
                    let currentVersion;
                    let attemptedVersion;
                    try {
                        const errorData = JSON.parse(errorBody);
                        const error = errorData.error;
                        if (error && error.reason) {
                            const versionMatch = error.reason.match(/current version \[(\d+)\].*version \[(\d+)\]/);
                            if (versionMatch) {
                                currentVersion = parseInt(versionMatch[1], 10);
                                attemptedVersion = parseInt(versionMatch[2], 10);
                            }
                        }
                    }
                    catch (e) {
                    }
                    throw new VersionConflictError('Document version conflict: another process has modified this document', currentVersion, attemptedVersion);
                }
                const shouldLogError = response.status !== 404 &&
                    !(response.status === 400 &&
                        errorBody.includes('resource_already_exists_exception'));
                if (shouldLogError) {
                    (0, logging_1.logError)('Elasticsearch Error Details:', {
                        status: `${response.status} ${response.statusText}`,
                        url,
                        method,
                        response: errorBody,
                        requestBody: data && !['GET', 'HEAD'].includes(method.toUpperCase())
                            ? JSON.stringify(data, null, 2)
                            : undefined,
                    });
                }
                else {
                    (0, logging_1.log)('Elasticsearch non-error response:', {
                        status: `${response.status} ${response.statusText}`,
                        url,
                        method,
                        responsePreview: errorBody.substring(0, 200),
                    });
                }
                throw new SearchError(`Search request failed: ${response.status} ${response.statusText}`, response.status, errorBody);
            }
            return await response.json();
        }
        catch (error) {
            if (error instanceof SearchError) {
                throw error;
            }
            if (attempt <= config.maxRetries) {
                const delayMs = this.calculateDelay({
                    attempt,
                    maxRetries: config.maxRetries,
                    baseDelayMs: config.baseDelayMs,
                    maxDelayMs: config.maxDelayMs,
                });
                (0, logging_1.logWarn)(`Request failed: ${error}. Retrying in ${delayMs}ms... (attempt ${attempt}/${config.maxRetries})`);
                await this.delay(delayMs);
                return this.executeRequest(method, path, data, attempt + 1);
            }
            throw new SearchError(`Search request failed after ${config.maxRetries} retries: ${error}`, undefined, error);
        }
    }
    async searchRequest(method, path, data, options) {
        let fullPath = path;
        if (options?.version) {
            const separator = path.includes('?') ? '&' : '?';
            fullPath = `${path}${separator}version=${options.version}&version_type=external`;
        }
        return this.executeRequest(method, fullPath, data);
    }
    async query(ModelClass, terms, options = {}) {
        let indexName;
        let isModelClass = false;
        if (typeof ModelClass === 'string') {
            indexName = ModelClass;
        }
        else {
            indexName = ModelClass.indexName;
            isModelClass = true;
            if (!indexName) {
                throw new SearchError(`IndexName not defined for ${ModelClass.name}`);
            }
        }
        const { limit = 1000, sort, page } = options;
        const searchBody = {
            query: {
                bool: {
                    must: terms.map((term) => ({
                        query_string: {
                            query: term,
                            default_operator: 'AND',
                        },
                    })),
                },
            },
            size: limit,
        };
        if (sort) {
            let fieldName = sort;
            let sortOrder = 'asc';
            if (sort.includes(':')) {
                const [field, order] = sort.split(':');
                fieldName = field;
                sortOrder = order === 'desc' ? 'desc' : 'asc';
            }
            searchBody.sort = [{ [fieldName]: { order: sortOrder } }];
        }
        if (page && page > 1) {
            searchBody.from = (page - 1) * limit;
        }
        try {
            const response = await this.searchRequest('POST', `/${indexName}/_search`, searchBody);
            (0, logging_1.debug)('elasticsearch', 'query response', response);
            const total = response.hits?.total?.value ?? response.hits?.total ?? 0;
            (0, logging_1.debug)('elasticsearch', 'total', total);
            if (isModelClass) {
                const hits = response.hits?.hits?.map((hit) => ModelClass.fromJSON({
                    id: hit._id,
                    ...hit._source,
                })) || [];
                return { hits, total };
            }
            else {
                const hits = response.hits?.hits?.map((hit) => hit._source) || [];
                return { hits, total };
            }
        }
        catch (error) {
            if (error instanceof SearchError && error.statusCode === 404) {
                (0, logging_1.debug)('search', `Index ${indexName} not found (404), returning empty results`);
                return { hits: [], total: 0 };
            }
            throw error;
        }
    }
    async getById(ModelClass, id) {
        const indexName = ModelClass.indexName;
        if (!indexName) {
            throw new SearchError(`IndexName not defined for ${ModelClass.name}`);
        }
        try {
            const response = await this.searchRequest('GET', `/${indexName}/_doc/${id}`);
            if (response.found) {
                return ModelClass.fromJSON({
                    id: response._id,
                    ...response._source,
                });
            }
            return null;
        }
        catch (error) {
            if (error instanceof SearchError && error.statusCode === 404) {
                (0, logging_1.debug)('search', `Document ${id} not found in index ${indexName} (404), returning null`);
                return null;
            }
            throw error;
        }
    }
}
exports.search = new SearchService();
//# sourceMappingURL=SearchService.js.map