export class ValidationError extends Error {
    constructor(fieldErrors, message) {
        const entries = Object.entries(fieldErrors);
        const fallback = entries[0]?.[1] ?? 'Validation failed';
        super(message ?? fallback);
        this.code = 'VALIDATION';
        this.name = 'ValidationError';
        this.fieldErrors = fieldErrors;
    }
    static fromMessage(message) {
        const field = fieldNameFromMessage(message);
        return new ValidationError({ [field ?? '_form']: message }, message);
    }
}
const FIELD_PATTERNS = [
    /^Field '([^']+)' /,
    /^Required property '([^']+)' is missing$/,
    /^Required field '([^']+)' is missing$/,
    /^Vector field '([^']+)' /,
];
function fieldNameFromMessage(message) {
    for (const pattern of FIELD_PATTERNS) {
        const match = message.match(pattern);
        if (match)
            return match[1];
    }
    return null;
}
export function validationFail(message) {
    throw ValidationError.fromMessage(message);
}
//# sourceMappingURL=ValidationError.js.map