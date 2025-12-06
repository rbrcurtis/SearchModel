import 'reflect-metadata'
import { SearchModel } from '../SearchModel'
import { StringArrayType } from '../../decorators'
import { id } from '../../utils/id'

// Test model with string array field
class StringArrayTestModel extends SearchModel<StringArrayTestModel> {
  static readonly indexName = `search_model_tests_${id()}`

  @StringArrayType({ required: true })
  tags!: string[]

  @StringArrayType()
  categories?: string[]
}

describe('StringArrayType Elasticsearch Integration', () => {
  let testIndexName: string

  beforeAll(async () => {
    testIndexName = StringArrayTestModel.indexName
    await SearchModel.createIndex.call(StringArrayTestModel as any)
  })

  afterAll(async () => {
    // Manual cleanup since there's no deleteIndex method
    const { search } = await import('../SearchService')
    try {
      await search.searchRequest('DELETE', `/${testIndexName}`)
    } catch (err) {
      // Index might not exist, ignore
    }
  })

  it('should save, load, save again, load again, modify, save, and load with string array field persisting correctly', async () => {
    // Step 1: Create instance with string array and save
    const testId = id()
    const model = new StringArrayTestModel({
      id: testId,
      tags: ['tag1', 'tag2', 'tag3'],
      categories: ['cat1', 'cat2']
    })

    await model.save()
    expect(model.id).toBe(testId)

    // Step 2: Load from database and verify string array
    const loaded1 = await StringArrayTestModel.getById(testId)
    expect(loaded1).toBeDefined()
    expect(loaded1!.id).toBe(testId)
    expect(Array.isArray(loaded1!.tags)).toBe(true)
    expect([...loaded1!.tags]).toEqual(['tag1', 'tag2', 'tag3'])
    expect(Array.isArray(loaded1!.categories)).toBe(true)
    expect([...loaded1!.categories!]).toEqual(['cat1', 'cat2'])

    // Step 3: Save again without modifications
    await loaded1!.save()

    // Step 4: Load again and verify string array still correct
    const loaded2 = await StringArrayTestModel.getById(testId)
    expect(loaded2).toBeDefined()
    expect(loaded2!.id).toBe(testId)
    expect(Array.isArray(loaded2!.tags)).toBe(true)
    expect([...loaded2!.tags]).toEqual(['tag1', 'tag2', 'tag3'])
    expect(Array.isArray(loaded2!.categories)).toBe(true)
    expect([...loaded2!.categories!]).toEqual(['cat1', 'cat2'])

    // Step 5: Modify the string array value
    loaded2!.tags = ['modified1', 'modified2']
    loaded2!.categories = ['newcat1', 'newcat2', 'newcat3']

    // Step 6: Save with modifications
    await loaded2!.save()

    // Step 7: Load final time and verify changes persisted
    const loaded3 = await StringArrayTestModel.getById(testId)
    expect(loaded3).toBeDefined()
    expect(loaded3!.id).toBe(testId)
    expect(Array.isArray(loaded3!.tags)).toBe(true)
    expect([...loaded3!.tags]).toEqual(['modified1', 'modified2'])
    expect(Array.isArray(loaded3!.categories)).toBe(true)
    expect([...loaded3!.categories!]).toEqual(['newcat1', 'newcat2', 'newcat3'])

    // Cleanup
    await loaded3!.delete()
  })

  it('should handle empty string arrays correctly through save/load cycles', async () => {
    const testId = id()
    const model = new StringArrayTestModel({
      id: testId,
      tags: [],
      categories: []
    })

    await model.save()

    const loaded = await StringArrayTestModel.getById(testId)
    expect(loaded).toBeDefined()
    expect(Array.isArray(loaded!.tags)).toBe(true)
    expect([...loaded!.tags]).toEqual([])
    expect(Array.isArray(loaded!.categories)).toBe(true)
    expect([...loaded!.categories!]).toEqual([])

    await loaded!.delete()
  })

  it('should handle single-element string arrays correctly', async () => {
    const testId = id()
    const model = new StringArrayTestModel({
      id: testId,
      tags: ['single-tag']
    })

    await model.save()

    const loaded = await StringArrayTestModel.getById(testId)
    expect(loaded).toBeDefined()
    expect(Array.isArray(loaded!.tags)).toBe(true)
    expect([...loaded!.tags]).toEqual(['single-tag'])

    await loaded!.delete()
  })
})
