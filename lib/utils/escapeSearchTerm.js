"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeSearchTerm = escapeSearchTerm;
const QUERY_STRING_SPECIAL_CHARS = /([+\-=&|><!(){}[\]^"~*?:\\/])/g;
function escapeSearchTerm(value) {
    return value.replace(QUERY_STRING_SPECIAL_CHARS, '\\$1');
}
//# sourceMappingURL=escapeSearchTerm.js.map