"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldMetadata = getFieldMetadata;
exports.validateFieldType = validateFieldType;
exports.DateType = DateType;
exports.StringType = StringType;
exports.NumberType = NumberType;
exports.BooleanType = BooleanType;
exports.StringArrayType = StringArrayType;
exports.ObjectType = ObjectType;
exports.ObjectArrayType = ObjectArrayType;
exports.KeywordType = KeywordType;
exports.StringMapType = StringMapType;
const FIELD_METADATA_KEY = Symbol('fieldMetadata');
function getFieldMetadata(target) {
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
function validateFieldType(value, type, propertyKey, options) {
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
function createValidatedProperty(target, propertyKey, type, options) {
    const privateKey = `_${propertyKey}`;
    Object.defineProperty(target, propertyKey, {
        get: function () {
            let value = this[privateKey];
            if (value === undefined && options.default) {
                value = options.default();
                this[privateKey] = value;
            }
            return value;
        },
        set: function (value) {
            const oldValue = this[privateKey];
            if (value !== undefined && value !== null) {
                validateFieldType(value, type, propertyKey, options);
                if (options.validate && !options.validate(value)) {
                    throw new Error(`Field '${propertyKey}' failed custom validation`);
                }
            }
            this[privateKey] = value;
            if (this.markFieldChanged && oldValue !== value) {
                this.markFieldChanged(propertyKey);
            }
        },
        enumerable: true,
        configurable: true,
    });
}
function DateType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'date',
            options,
        });
        createValidatedProperty(target, propertyKey, 'date', options);
    };
}
function StringType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'string',
            options,
        });
        createValidatedProperty(target, propertyKey, 'string', options);
    };
}
function NumberType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'number',
            options,
        });
        createValidatedProperty(target, propertyKey, 'number', options);
    };
}
function BooleanType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'boolean',
            options,
        });
        createValidatedProperty(target, propertyKey, 'boolean', options);
    };
}
function StringArrayType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'stringArray',
            options,
        });
        createValidatedProperty(target, propertyKey, 'stringArray', options);
    };
}
function ObjectType(options) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'object',
            options,
        });
        createValidatedProperty(target, propertyKey, 'object', options);
    };
}
function ObjectArrayType(options) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'objectArray',
            options,
        });
        createValidatedProperty(target, propertyKey, 'objectArray', options);
    };
}
function KeywordType(options = {}) {
    return function (target, propertyKey) {
        setFieldMetadata(target, {
            propertyKey,
            type: 'keyword',
            options,
        });
        createValidatedProperty(target, propertyKey, 'keyword', options);
    };
}
function StringMapType(options = {}) {
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