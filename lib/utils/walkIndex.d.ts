import { SearchModel } from '../core/SearchModel';
export declare function walkIndex<T extends typeof SearchModel>(ModelClass: T, terms: string[], callback: (hit: InstanceType<T>) => Promise<void>): Promise<void>;
