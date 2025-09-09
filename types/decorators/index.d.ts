export declare const PRIVATE_STORAGE: unique symbol;
interface BaseFieldOptions {
    required?: boolean;
    transform?: (value: any) => any;
    validate?: (value: any) => boolean;
    default?: () => any;
}
interface StringFieldOptions extends BaseFieldOptions {
    trim?: boolean;
    lowerCase?: boolean;
    upperCase?: boolean;
}
interface ObjectPropertyDefinition {
    type: 'date' | 'string' | 'number' | 'stringArray' | 'object' | 'objectArray' | 'boolean' | 'keyword' | 'stringMap';
    options?: BaseFieldOptions | StringFieldOptions | ObjectFieldOptions;
}
interface ObjectFieldOptions extends BaseFieldOptions {
    properties: Record<string, ObjectPropertyDefinition>;
}
export interface FieldMetadata {
    propertyKey: string;
    type: 'date' | 'string' | 'number' | 'stringArray' | 'object' | 'objectArray' | 'boolean' | 'keyword' | 'stringMap';
    options?: BaseFieldOptions | StringFieldOptions | ObjectFieldOptions;
}
export declare function getFieldMetadata(target: any): FieldMetadata[];
export declare function validateFieldType(value: any, type: string, propertyKey: string, options?: any): void;
export declare function DateType(options?: BaseFieldOptions): (target: any, propertyKey: string) => void;
export declare function StringType(options?: StringFieldOptions): (target: any, propertyKey: string) => void;
export declare function NumberType(options?: BaseFieldOptions): (target: any, propertyKey: string) => void;
export declare function BooleanType(options?: BaseFieldOptions): (target: any, propertyKey: string) => void;
export declare function StringArrayType(options?: BaseFieldOptions): (target: any, propertyKey: string) => void;
export declare function ObjectType(options: ObjectFieldOptions): (target: any, propertyKey: string) => void;
export declare function ObjectArrayType(options: ObjectFieldOptions): (target: any, propertyKey: string) => void;
export declare function KeywordType(options?: StringFieldOptions): (target: any, propertyKey: string) => void;
export declare function StringMapType(options?: BaseFieldOptions): (target: any, propertyKey: string) => void;
export {};
