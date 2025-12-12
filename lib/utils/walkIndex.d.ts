export declare function walkIndex<T extends {
    id: string;
}>(ModelClass: (new (data?: Partial<T>) => T) & {
    indexName: string;
    fromJSON(data: any): T;
}, terms: string[], callback: (hit: T) => Promise<void>, options?: {
    concurrency?: number;
}): Promise<void>;
