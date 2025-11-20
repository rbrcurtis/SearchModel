import 'reflect-metadata'
import { SearchModel } from '../../core/SearchModel'
import { StringType, NumberType } from '../../decorators'
import { id } from '../id'
import { walkIndex } from '../walkIndex'

const testIndexName = `walk_index_test_${id()}`

class WalkIndexTestModel extends SearchModel {
  static readonly indexName = testIndexName

  @StringType({ required: true })
  name!: string

  @NumberType({ required: true })
  value!: number
}

describe('walkIndex', () => {
  beforeAll(async () => {
    await WalkIndexTestModel.createIndex()
  })

  afterAll(async () => {
    try {
      await WalkIndexTestModel.deleteIndex()
    } catch (err) {
      // Ignore errors on cleanup
    }
  })

  it('should walk through all 100 documents', async () => {
    // Create 100 documents
    const ids: string[] = []
    for (let i = 0; i < 100; i++) {
      const doc = await WalkIndexTestModel.create({
        name: `test1-doc-${i}`,
        value: i,
      })
      ids.push(doc.id)
    }

    // Wait for Elasticsearch to index all documents
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Track which documents were touched
    const touched = new Set<string>()

    // Walk through all documents
    await walkIndex(WalkIndexTestModel, ['*'], async (instance) => {
      if (instance.name.startsWith('test1-doc-')) {
        touched.add(instance.id)
      }
    })

    // Verify all 100 documents were touched
    expect(touched.size).toBe(100)

    // Verify each document was touched exactly once
    for (const docId of ids) {
      expect(touched.has(docId)).toBe(true)
    }
  }, 120000)

  it('should process documents with custom concurrency', async () => {
    // Create 50 documents for concurrency test
    const ids: string[] = []
    for (let i = 0; i < 50; i++) {
      const doc = await WalkIndexTestModel.create({
        name: `test2-concurrency-${i}`,
        value: i + 1000,
      })
      ids.push(doc.id)
    }

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Track concurrent executions
    let currentlyRunning = 0
    let maxConcurrent = 0
    const touched = new Set<string>()

    await walkIndex(
      WalkIndexTestModel,
      ['*'],
      async (instance) => {
        if (instance.name.startsWith('test2-concurrency-')) {
          currentlyRunning++
          maxConcurrent = Math.max(maxConcurrent, currentlyRunning)
          touched.add(instance.id)

          // Simulate some async work
          await new Promise((resolve) => setTimeout(resolve, 10))

          currentlyRunning--
        }
      },
      { concurrency: 5 }
    )

    // Verify all documents were processed
    expect(touched.size).toBe(50)

    // Verify concurrency was respected (should be <= 5)
    expect(maxConcurrent).toBeLessThanOrEqual(5)
    expect(maxConcurrent).toBeGreaterThan(1) // Should have some concurrency
  }, 60000)

  it('should handle empty results on fresh index', async () => {
    // Create a new model class with a new index
    const freshIndexName = `walk_index_fresh_${id()}`

    class FreshTestModel extends SearchModel {
      static readonly indexName = freshIndexName

      @StringType({ required: true })
      name!: string
    }

    await FreshTestModel.createIndex()

    const touched: string[] = []
    await walkIndex(FreshTestModel, ['*'], async (instance) => {
      touched.push(instance.id)
    })

    expect(touched.length).toBe(0)
  })

  it('should allow modifications during walk', async () => {
    // Create test documents
    const docs = []
    for (let i = 0; i < 10; i++) {
      const doc = await WalkIndexTestModel.create({
        name: `test4-modify-${i}`,
        value: 200 + i,
      })
      docs.push(doc)
    }

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Modify each document during walk
    await walkIndex(WalkIndexTestModel, ['*'], async (instance) => {
      if (instance.name.startsWith('test4-modify-')) {
        instance.value = instance.value * 2
        await instance.save()
      }
    })

    // Wait for updates to be indexed
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Verify modifications
    for (const doc of docs) {
      const updated = await WalkIndexTestModel.getById(doc.id)
      expect(updated?.value).toBe(doc.value * 2)
    }
  }, 60000)
})
