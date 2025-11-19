"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkIndex = walkIndex;
const SearchService_1 = require("../core/SearchService");
async function walkIndex(ModelClass, terms, callback) {
    const indexName = ModelClass.indexName;
    let lastId = null;
    const size = 100;
    while (true) {
        const queryTerms = [...terms];
        if (lastId) {
            queryTerms.push(`id:{${lastId} TO *}`);
        }
        const results = await SearchService_1.search.query(indexName, queryTerms, {
            limit: size,
            sort: 'id',
        });
        if (results.hits.length === 0) {
            break;
        }
        for (const hit of results.hits) {
            const instance = ModelClass.fromJSON(hit);
            await callback(instance);
            lastId = instance.id;
        }
        if (results.hits.length < size) {
            break;
        }
    }
}
//# sourceMappingURL=walkIndex.js.map