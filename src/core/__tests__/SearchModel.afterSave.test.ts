import 'reflect-metadata'
import { SearchModel, SaveEvent } from '../SearchModel'
import { StringType, NumberType } from '../../decorators'
import { id } from '../../utils/id'

// Test model with afterSave hook
class AfterSaveTestModel extends SearchModel<AfterSaveTestModel> {
  static readonly indexName = `after_save_tests_${id()}`

  @StringType({ required: true })
  name!: string

  @NumberType()
  count?: number

  // Track hook calls
  afterSaveCalled = false
  afterSaveEvent: SaveEvent | null = null
  afterSaveTimestamp: Date | null = null

  protected async afterSave(event: SaveEvent): Promise<void> {
    console.log('afterSave', event)
    this.afterSaveCalled = true
    this.afterSaveEvent = event
    this.afterSaveTimestamp = new Date()
  }
}

describe('SearchModel afterSave Integration', () => {
  let testIndexName: string

  beforeAll(async () => {
    testIndexName = AfterSaveTestModel.indexName
    await SearchModel.createIndex.call(AfterSaveTestModel as any)
  })

  afterAll(async () => {
    const { search } = await import('../SearchService')
    try {
      await search.searchRequest('DELETE', `/${testIndexName}`)
    } catch (err) {
      // Index might not exist, ignore
    }
  })

  it('should call afterSave after saving a new document', async () => {
    const testId = id()
    const model = new AfterSaveTestModel({
      id: testId,
      name: 'Test Document',
      count: 1,
    })

    expect(model.afterSaveCalled).toBe(false)

    await model.save()

    expect(model.afterSaveCalled).toBe(true)
    expect(model.afterSaveEvent).toBeDefined()
    expect(model.afterSaveTimestamp).toBeInstanceOf(Date)

    // Verify document was actually saved
    const loaded = await AfterSaveTestModel.getById(testId)
    expect(loaded).toBeDefined()
    expect(loaded!.name).toBe('Test Document')

    await loaded!.delete()
  })

  it('should call afterSave after updating an existing document', async () => {
    const testId = id()
    const model = new AfterSaveTestModel({
      id: testId,
      name: 'Initial Name',
      count: 1,
    })

    await model.save()
    expect(model.afterSaveCalled).toBe(true)

    // Reset tracking
    model.afterSaveCalled = false
    model.afterSaveEvent = null

    // Update and save again
    model.name = 'Updated Name'
    model.count = 2
    await model.save()

    expect(model.afterSaveCalled).toBe(true)
    expect(model.afterSaveEvent).toBeDefined()

    // Verify update persisted
    const loaded = await AfterSaveTestModel.getById(testId)
    expect(loaded!.name).toBe('Updated Name')
    expect(loaded!.count).toBe(2)

    await loaded!.delete()
  })

  it('should receive updated fields in afterSave event', async () => {
    const testId = id()
    const model = new AfterSaveTestModel({
      id: testId,
      name: 'Test',
      count: 0,
    })

    await model.save()

    // Reset and modify
    model.afterSaveCalled = false
    model.afterSaveEvent = null
    model.name = 'Changed Name'

    await model.save()

    expect(model.afterSaveCalled).toBe(true)
    expect(model.afterSaveEvent).toBeDefined()
    expect(model.afterSaveEvent!.updated).toContain('name')

    await model.delete()
  })
})
