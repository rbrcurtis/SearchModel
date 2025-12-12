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
export interface SaveOptions {
    wait?: boolean;
}
export declare abstract class SearchModel<T extends SearchModel<T>> {
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
    protected beforeSave(event: SaveEvent): Promise<boolean>;
    protected afterSave(event: SaveEvent): Promise<void>;
    protected beforeDelete(event: DeleteEvent): Promise<void>;
    protected afterDelete(event: DeleteEvent): Promise<void>;
    constructor(data?: Partial<T>);
    static fromJSON<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T, properties: Partial<T>): T;
    static generateMapping<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T & {
        constructor: typeof SearchModel;
    }): Record<string, any>;
    static getElasticsearchFieldType(field: FieldMetadata): any;
    static buildObjectMapping(properties: Record<string, any>): Record<string, any>;
    static createIndex<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T & {
        constructor: typeof SearchModel;
    }): Promise<void>;
    static create<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T, properties: Partial<T>, options?: SaveOptions): Promise<T>;
    static find<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T, terms?: string[], options?: SearchOptions): Promise<T[]>;
    static findWithTotal<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T, terms?: string[], options?: SearchOptions): Promise<{
        hits: T[];
        total: number;
    }>;
    static findOne<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T, terms: string[]): Promise<T | null>;
    static getById<T extends SearchModel<T>>(this: new (data?: Partial<T>) => T, id: string): Promise<T | null>;
    private applyDefaults;
    private validateRequiredFields;
    save(options?: SaveOptions): Promise<this>;
    delete(): Promise<void>;
    toJSON(): any;
    private transformObjectValue;
    private transformFieldValue;
    toString(): string;
    update(data: Record<string, any>): this;
    toSearch(): Record<string, any>;
}
