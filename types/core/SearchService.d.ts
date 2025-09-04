import 'dotenv/config';
interface SearchConfig {
    baseUrl: string;
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}
export declare class SearchError extends Error {
    statusCode?: number | undefined;
    response?: any | undefined;
    constructor(message: string, statusCode?: number | undefined, response?: any | undefined);
}
export declare class VersionConflictError extends SearchError {
    currentVersion?: number | undefined;
    attemptedVersion?: number | undefined;
    constructor(message: string, currentVersion?: number | undefined, attemptedVersion?: number | undefined);
}
export declare class SearchService {
    private config;
    constructor(config?: Partial<SearchConfig>);
    private delay;
    private calculateDelay;
    private executeRequest;
    searchRequest(method: string, path: string, data?: any, options?: {
        version?: number;
    }): Promise<any>;
    query<T extends any>(ModelClass: string | ((new (data?: any) => T) & {
        indexName: string;
        fromJSON: (data: any) => T;
    }), terms: string[], options?: {
        limit?: number;
        sort?: string;
        page?: number;
    }): Promise<{
        hits: T[];
        total: number;
    }>;
    getById<T extends any>(ModelClass: (new (data?: any) => T) & {
        indexName: string;
        fromJSON: (data: any) => T;
    }, id: string): Promise<T | null>;
}
export declare const search: SearchService;
export {};
