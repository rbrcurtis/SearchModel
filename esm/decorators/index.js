import { createTrackedArray } from '../utils/arrayProxy';
const FIELD_METADATA_KEY = Symbol('fieldMetadata');
export const PRIVATE_STORAGE = Symbol('__privateStorage__');
export function getFieldMetadata(target) {
    return Reflect.getMetadata(FIELD_METADATA_KEY, target) || [];
}
function setFieldMetadata(target, metadata) {
    const existingMetadata = getFieldMetadata(target);
    const updatedMetadata = [...existingMetadata, metadata];
    Reflect.defineMetadata(FIELD_METADATA_KEY, updatedMetadata, target);
}
function validateObjectProperties(obj, properties, fieldPath) {
    for (const [propKey, propDef] of Object.entries(properties)) {
        const propPath = `${fieldPath}.${propKey}`;
        const propValue = obj[propKey];
        const propOptions = propDef.options || {};
        if (propOptions.required &&
            (propValue === undefined || propValue === null)) {
            throw new Error(`Required property '${propPath}' is missing`);
        }
        if (propValue !== undefined && propValue !== null) {
            validateFieldType(propValue, propDef.type, propPath, propDef.options);
        }
    }
}
export function validateFieldType(value, type, propertyKey, options) {
    switch (type) {
        case 'date':
            if (!(value instanceof Date) && typeof value !== 'string') {
                throw new Error(`Field '${propertyKey}' must be a Date or string, got ${typeof value}`);
            }
            if (typeof value === 'string' && isNaN(Date.parse(value))) {
                throw new Error(`Field '${propertyKey}' must be a valid date string`);
            }
            break;
        case 'string':
        case 'keyword':
            if (typeof value !== 'string') {
                throw new Error(`Field '${propertyKey}' must be a string, got ${typeof value}`);
            }
            break;
        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(`Field '${propertyKey}' must be a valid number, got ${typeof value}`);
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                throw new Error(`Field '${propertyKey}' must be a boolean, got ${typeof value}`);
            }
            break;
        case 'stringArray':
            if (!Array.isArray(value)) {
                throw new Error(`Field '${propertyKey}' must be an array, got ${typeof value}`);
            }
            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] !== 'string') {
                    throw new Error(`Field '${propertyKey}' must be an array of strings, found ${typeof value[i]} at index ${i}`);
                }
            }
            break;
        case 'object':
            if (value === null) {
                throw new Error(`Field '${propertyKey}' must be an object, got null`);
            }
            if (typeof value !== 'object' || Array.isArray(value)) {
                throw new Error(`Field '${propertyKey}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
            }
            if (options && options.properties) {
                validateObjectProperties(value, options.properties, propertyKey);
            }
            break;
        case 'objectArray':
            if (!Array.isArray(value)) {
                throw new Error(`Field '${propertyKey}' must be an array, got ${typeof value}`);
            }
            if (options && options.properties) {
                for (let i = 0; i < value.length; i++) {
                    const item = value[i];
                    if (typeof item !== 'object' ||
                        Array.isArray(item) ||
                        item === null) {
                        throw new Error(`Field '${propertyKey}[${i}]' must be an object, got ${typeof item}`);
                    }
                    validateObjectProperties(item, options.properties, `${propertyKey}[${i}]`);
                }
            }
            break;
        case 'stringMap':
            if (value === null) {
                throw new Error(`Field '${propertyKey}' must be an object, got null`);
            }
            if (typeof value !== 'object' || Array.isArray(value)) {
                throw new Error(`Field '${propertyKey}' must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
            }
            break;
    }
}
function getPrivateStorage(instance) {
    if (!instance[PRIVATE_STORAGE]) {
        Object.defineProperty(instance, PRIVATE_STORAGE, {
            value: {},
            writable: false,
            enumerable: false,
            configurable: false
        });
    }
    return instance[PRIVATE_STORAGE];
}
function createValidatedProperty(target, propertyKey, type, options) {
    Object.defineProperty(target, propertyKey, {
        get: function () {
            const storage = getPrivateStorage(this);
            const value = storage[propertyKey];
            if (value && Array.isArray(value) && (type === 'stringArray' || type === 'objectArray')) {
                if (!value.__isTrackedArray) {
                    const trackedArray = createTrackedArray(value, () => {
                        if (this.markFieldChanged) {
                            this.markFieldChanged(propertyKey);
                        }
                    });
                    storage[propertyKey] = trackedArray;
                    return trackedArray;
                }
            }
            return value;
        },
        set: function (value) {
            const storage = getPrivateStorage(this);
            const oldValue = storage[propertyKey];
            if (value !== undefined && value !== null) {
                validateFieldType(value, type, propertyKey, options);
                if (options.validate && !options.validate(value)) {
                    throw new Error(`Field '${propertyKey}' failed custom validation`);
                }
                if (Array.isArray(value) && (type === 'stringArray' || type === 'objectArray')) {
                    const trackedArray = createTrackedArray(value, () => {
                        if (this.markFieldChanged) {
                            this.markFieldChanged(propertyKey);
                        }
                    });
                    storage[propertyKey] = trackedArray;
                }
                else {
                    storage[propertyKey] = value;
                }
            }
            else {
                storage[propertyKey] = value;
            }
            if (this.markFieldChanged && oldValue !== value) {
                this.markFieldChanged(propertyKey);
            }
        },
        enumerable: true,
        configurable: true,
    });
}
export function DateType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'date',
            options,
        });
        createValidatedProperty(target, propertyKey, 'date', options);
    };
}
export function StringType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'string',
            options,
        });
        createValidatedProperty(target, propertyKey, 'string', options);
    };
}
export function NumberType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'number',
            options,
        });
        createValidatedProperty(target, propertyKey, 'number', options);
    };
}
export function BooleanType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'boolean',
            options,
        });
        createValidatedProperty(target, propertyKey, 'boolean', options);
    };
}
export function StringArrayType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'stringArray',
            options,
        });
        createValidatedProperty(target, propertyKey, 'stringArray', options);
    };
}
export function ObjectType(options) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'object',
            options,
        });
        createValidatedProperty(target, propertyKey, 'object', options);
    };
}
export function ObjectArrayType(options) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'objectArray',
            options,
        });
        createValidatedProperty(target, propertyKey, 'objectArray', options);
    };
}
export function KeywordType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'keyword',
            options,
        });
        createValidatedProperty(target, propertyKey, 'keyword', options);
    };
}
export function StringMapType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'stringMap',
            options,
        });
        createValidatedProperty(target, propertyKey, 'stringMap', options);
    };
}
//# sourceMappingURL=index.js.map