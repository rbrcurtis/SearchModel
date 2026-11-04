"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIndexName = resolveIndexName;
require("dotenv/config");
const VALID_PREFIX = /^[a-z0-9_-]+$/;
function resolveIndexName(indexName) {
    const prefix = process.env.ES_INDEX_PREFIX;
    if (!prefix) {
        return indexName;
    }
    if (!VALID_PREFIX.test(prefix)) {
        throw new Error(`Invalid ES_INDEX_PREFIX '${prefix}': must match ${VALID_PREFIX}`);
    }
    if (indexName.startsWith(prefix)) {
        return indexName;
    }
    return `${prefix}${indexName}`;
}
//# sourceMappingURL=indexName.js.map