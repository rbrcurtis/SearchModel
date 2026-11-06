const QUERY_STRING_SPECIAL_CHARS = /([+\-=&|><!(){}[\]^"~*?:\\/])/g;
export function escapeSearchTerm(value) {
    return value.replace(QUERY_STRING_SPECIAL_CHARS, '\\$1');
}
//# sourceMappingURL=escapeSearchTerm.js.map