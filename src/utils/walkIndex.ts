import { SearchModel } from '../core/SearchModel'
import { search } from '../core/SearchService'

export async function walkIndex<T extends typeof SearchModel>(
  ModelClass: T,
  terms: string[],
  callback: (hit: InstanceType<T>) => Promise<void>
): Promise<void> {
  const indexName = (ModelClass as any).indexName
  let lastId: string | null = null
  const size = 100

  while (true) {
    const queryTerms = [...terms]
    if (lastId) {
      queryTerms.push(`id:{${lastId} TO *}`)
    }

    const results = await search.query(indexName, queryTerms, {
      limit: size,
      sort: 'id',
    })

    if (results.hits.length === 0) {
      break
    }

    for (const hit of results.hits) {
      const instance = (ModelClass as any).fromJSON(hit) as InstanceType<T>
      await callback(instance)
      lastId = (instance as any).id
    }

    if (results.hits.length < size) {
      break
    }
  }
}
