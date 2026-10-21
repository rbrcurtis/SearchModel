export declare class ValidationError extends Error {
    readonly code = "VALIDATION";
    readonly fieldErrors: Record<string, string>;
    constructor(fieldErrors: Record<string, string>, message?: string);
    static fromMessage(message: string): ValidationError;
}
export declare function validationFail(message: string): never;
