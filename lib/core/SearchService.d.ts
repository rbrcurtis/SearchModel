import 'dotenv/config';
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
declare class SearchService {
    private config;
    private getConfig;
    _resetConfig(): void;
    private delay;
    private calculateDelay;
    private executeRequest;
    searchRequest(method: string, path: string, data?: any, options?: {
        version?: number;
    }): Promise<any>;
    query<T extends any>(ModelClass: string | ((new (data?: Partial<T>) => T) & {
        indexName: string;
        fromJSON: (data: Partial<T>) => T;
    }), terms: string[], options?: {
        limit?: number;
        sort?: string;
        page?: number;
    }): Promise<{
        hits: T[];
        total: number;
    }>;
    getById<T extends any>(ModelClass: (new (data?: Partial<T>) => T) & {
        indexName: string;
        fromJSON: (data: Partial<T>) => T;
    }, id: string): Promise<T | null>;
}
export declare const search: SearchService;
export {};
