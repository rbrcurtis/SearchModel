import 'reflect-metadata'
import { SearchModel } from '../../core/SearchModel'
import { NumberType, StringType } from '../index'
import { search } from '../../core/SearchService'
import { id } from '../../utils/id'

class NumberTestModel extends SearchModel<NumberTestModel> {
  static readonly indexName = `number_coercion_test_${id()}`

  @StringType({ required: true })
  name!: string

  @NumberType()
  count?: number

  @NumberType({ required: true })
  score!: number
}

describe('NumberType string coercion', () => {
  const testIndexName = NumberTestModel.indexName

  beforeAll(async () => {
    await SearchModel.createIndex.call(NumberTestModel as any)
  })

  afterAll(async () => {
    try {
      await search.searchRequest('DELETE', `/${testIndexName}`)
    } catch (err) {
      // Index might not exist, ignore
    }
  })

  it('should coerce string numbers to numbers when setting properties', () => {
    const model = new NumberTestModel({ name: 'test', score: 1 })

    // Set a string number
    ;(model as any).count = '42'

    expect(model.count).toBe(42)
    expect(typeof model.count).toBe('number')
  })

  it('should coerce string numbers in constructor', () => {
    const model = new NumberTestModel({
      name: 'test',
      score: '100' as any,
      count: '50' as any,
    })

    expect(model.score).toBe(100)
    expect(typeof model.score).toBe('number')
    expect(model.count).toBe(50)
    expect(typeof model.count).toBe('number')
  })

  it('should reject non-numeric strings', () => {
    const model = new NumberTestModel({ name: 'test', score: 1 })

    expect(() => {
      ;(model as any).count = 'not-a-number'
    }).toThrow()
  })

  it('should handle decimal string numbers', () => {
    const model = new NumberTestModel({ name: 'test', score: 1 })

    ;(model as any).count = '3.14'

    expect(model.count).toBe(3.14)
    expect(typeof model.count).toBe('number')
  })

  it('should handle negative string numbers', () => {
    const model = new NumberTestModel({ name: 'test', score: 1 })

    ;(model as any).count = '-25'

    expect(model.count).toBe(-25)
    expect(typeof model.count).toBe('number')
  })

  it('should read string numbers from Elasticsearch and coerce to number', async () => {
    const testId = id()

    // Write directly to ES with number stored as string (simulating bad data)
    await search.searchRequest(
      'PUT',
      `/${testIndexName}/_doc/${testId}?refresh=wait_for`,
      {
        id: testId,
        name: 'direct-write-test',
        score: '999', // String instead of number
        count: '123', // String instead of number
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }
    )

    // Read using the model
    const loaded = await NumberTestModel.getById(testId)

    expect(loaded).toBeDefined()
    expect(loaded!.name).toBe('direct-write-test')
    expect(loaded!.score).toBe(999)
    expect(typeof loaded!.score).toBe('number')
    expect(loaded!.count).toBe(123)
    expect(typeof loaded!.count).toBe('number')

    // Cleanup
    await loaded!.delete()
  })

  it('should handle mixed number and string number fields from Elasticsearch', async () => {
    const testId = id()

    // Write with one proper number and one string number
    await search.searchRequest(
      'PUT',
      `/${testIndexName}/_doc/${testId}?refresh=wait_for`,
      {
        id: testId,
        name: 'mixed-test',
        score: 50, // Proper number
        count: '75', // String number
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }
    )

    const loaded = await NumberTestModel.getById(testId)

    expect(loaded).toBeDefined()
    expect(loaded!.score).toBe(50)
    expect(typeof loaded!.score).toBe('number')
    expect(loaded!.count).toBe(75)
    expect(typeof loaded!.count).toBe('number')

    await loaded!.delete()
  })

  it('should save coerced numbers correctly and reload them', async () => {
    const testId = id()

    // Write with string numbers directly to ES
    await search.searchRequest(
      'PUT',
      `/${testIndexName}/_doc/${testId}?refresh=wait_for`,
      {
        id: testId,
        name: 'roundtrip-test',
        score: '200',
        count: '300',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }
    )

    // Load, modify, and save
    const loaded = await NumberTestModel.getById(testId)
    expect(loaded).toBeDefined()
    expect(loaded!.score).toBe(200)

    loaded!.count = 400
    await loaded!.save()

    // Reload and verify
    const reloaded = await NumberTestModel.getById(testId)
    expect(reloaded!.score).toBe(200)
    expect(typeof reloaded!.score).toBe('number')
    expect(reloaded!.count).toBe(400)
    expect(typeof reloaded!.count).toBe('number')

    await reloaded!.delete()
  })
})
