import { search } from '../core/SearchService';
async function processConcurrently(items, concurrency, processor) {
    const queue = [...items];
    const running = [];
    while (queue.length > 0 || running.length > 0) {
        while (running.length < concurrency && queue.length > 0) {
            const item = queue.shift();
            const promise = processor(item).then(() => {
                const idx = running.indexOf(promise);
                if (idx !== -1)
                    running.splice(idx, 1);
            });
            running.push(promise);
        }
        if (running.length > 0) {
            await Promise.race(running);
        }
    }
}
export async function walkIndex(ModelClass, terms, callback, options = {}) {
    const { concurrency = 10 } = options;
    const indexName = ModelClass.indexName;
    let lastId = null;
    const size = 100;
    const instances = [];
    while (true) {
        const queryTerms = [...terms];
        if (lastId) {
            queryTerms.push(`id:{${lastId} TO *}`);
        }
        const results = await search.query(indexName, queryTerms, {
            limit: size,
            sort: 'id',
        });
        if (results.hits.length === 0) {
            break;
        }
        for (const hit of results.hits) {
            const instance = ModelClass.fromJSON(hit);
            instances.push(instance);
            lastId = instance.id;
        }
        if (results.hits.length < size) {
            break;
        }
    }
    await processConcurrently(instances, concurrency, callback);
}
//# sourceMappingURL=walkIndex.js.map