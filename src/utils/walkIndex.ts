import { SearchModel } from '../core/SearchModel'
import { search } from '../core/SearchService'

async function processConcurrently<T>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items]
  const running: Promise<void>[] = []

  while (queue.length > 0 || running.length > 0) {
    // Fill up to concurrency limit
    while (running.length < concurrency && queue.length > 0) {
      const item = queue.shift()!
      const promise = processor(item).then(() => {
        const idx = running.indexOf(promise)
        if (idx !== -1) running.splice(idx, 1)
      })
      running.push(promise)
    }

    // Wait for at least one to finish
    if (running.length > 0) {
      await Promise.race(running)
    }
  }
}

export async function walkIndex<T extends { id: string }>(
  ModelClass: (new (data?: Partial<T>) => T) & { indexName: string; fromJSON(data: any): T },
  terms: string[],
  callback: (hit: T) => Promise<void>,
  options: { concurrency?: number } = {}
): Promise<void> {
  const { concurrency = 10 } = options
  const indexName = ModelClass.indexName
  let lastId: string | null = null
  const size = 100
  const instances: T[] = []

  while (true) {
    const queryTerms = [...terms]
    if (lastId) {
      queryTerms.push(`id:{${lastId} TO *}`)
    }

    const results = await search.query(indexName, queryTerms, {
      limit: size,
      sort: 'id.keyword',
    })

    if (results.hits.length === 0) {
      break
    }

    for (const hit of results.hits) {
      const instance = ModelClass.fromJSON(hit)
      instances.push(instance)
      lastId = instance.id
    }

    if (results.hits.length < size) {
      break
    }
  }

  // Process all instances with concurrency control
  await processConcurrently(instances, concurrency, callback)
}
