import 'reflect-metadata';
import { FieldMetadata } from '../decorators';
export interface SearchOptions {
    limit?: number;
    sort?: string;
    page?: number;
}
export interface SaveEvent {
    updated: string[];
}
export interface DeleteEvent {
}
export declare abstract class SearchModel {
    static readonly indexName: string;
    private _changedFields;
    private _isNewDocument;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    protected markFieldChanged(fieldName: string): void;
    protected getChangedFields(): string[];
    protected clearChangedFields(): void;
    protected beforeSave(event: SaveEvent): Promise<void>;
    protected afterSave(event: SaveEvent): Promise<void>;
    protected beforeDelete(event: DeleteEvent): Promise<void>;
    protected afterDelete(event: DeleteEvent): Promise<void>;
    constructor(data?: Partial<any>);
    static fromJSON<T extends SearchModel>(this: new (data?: any) => T, properties: any): T;
    static generateMapping<T extends SearchModel>(this: new (data?: any) => T & {
        constructor: typeof SearchModel;
    }): Record<string, any>;
    static getElasticsearchFieldType(field: FieldMetadata): any;
    static buildObjectMapping(properties: Record<string, any>): Record<string, any>;
    static createIndex<T extends SearchModel>(this: new (data?: any) => T & {
        constructor: typeof SearchModel;
    }): Promise<void>;
    static create<T extends SearchModel>(this: new (data?: any) => T, properties: Partial<T>): Promise<T>;
    static find<T extends SearchModel>(this: new (data?: any) => T, terms?: string[], options?: SearchOptions): Promise<T[]>;
    static findWithTotal<T extends SearchModel>(this: new (data?: any) => T, terms?: string[], options?: SearchOptions): Promise<{
        hits: T[];
        total: number;
    }>;
    static findOne<T extends SearchModel>(this: new (data?: any) => T, terms: string[]): Promise<T | null>;
    static getById<T extends SearchModel>(this: new (data?: any) => T, id: string): Promise<T | null>;
    private applyDefaults;
    private validateRequiredFields;
    save(): Promise<this>;
    delete(): Promise<void>;
    protected toDocument(): Record<string, any>;
    private transformObjectValue;
    private transformFieldValue;
    toString(): string;
    toSearch(): Record<string, any>;
}
